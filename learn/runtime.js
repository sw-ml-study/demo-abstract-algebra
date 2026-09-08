// The only file that knows how MLPL is reached from a page.
//
// Everything above this talks to `MlplRuntime`; everything below it is a
// bridge that will be deleted. See docs/mlpl-blockers.md B7.
//
// WHY A BRIDGE. The interpreter compiles to WASM and `mlpl-wasm` is already a
// clean cdylib exporting exactly what a lesson runner needs -- `WasmSession`
// with `new`, `eval` and `clear`. But the only PUBLISHED artifact is the whole
// Yew playground application, which mounts a UI on `init()` and hard-requires
// a Window. It cannot be loaded as a library.
//
// So the playground is loaded in a hidden iframe served from our own origin,
// and the parent reaches through: the playground's index.html assigns
// `window.wasmBindings`, and same-origin means we can read it. The UI it mounts
// is never shown. This costs an 8 MB download and an application nobody looks
// at; B7 asks for a headless `--target web` build of `mlpl-wasm` alone, and the
// step that adopts it replaces `IframeRuntime` and changes nothing else.

/**
 * How long to wait for the interpreter to publish its bindings, in ms.
 * Measured at ~100 ms locally and ~950 ms over the network from Pages.
 */
const BOOT_TIMEOUT_MS = 30000;

/**
 * An MLPL evaluation result.
 *
 * `display` is what the playground would print. `failed` is true when the
 * session could not evaluate the source at all.
 *
 * @typedef {{display: string, failed: boolean}} MlplResult
 */

/**
 * Strip the `Ok(...)` wrapper the session puts around a Result's payload.
 *
 * `to_json` answers a Result, and a session hands back that value's DISPLAY
 * form rather than the value, so JSON arrives as `Ok({"pass":1})` rather than
 * `{"pass":1}`. That is docs/upstream-asks.md #10 met at a second boundary,
 * recorded as #20. Unwrapping is one regex and it is the whole grading
 * boundary, so it lives here rather than in every checker.
 *
 * @param {string} display
 * @returns {string} the payload, or the input unchanged if it is not wrapped
 */
export function unwrapResult(display) {
  const m = /^(?:Ok|Err)\(([\s\S]*)\)$/.exec(display.trim());
  return m ? m[1] : display.trim();
}

/**
 * True when a session's output reports a failure to the reader.
 *
 * Two shapes, and the second is the one that hides. `include` and a syntax
 * error answer `error: ...`. But `write_text`, `read_text` and `run_script`
 * answer `Err(... no filesystem sandbox on this surface)` -- an ordinary
 * Result, invisible to anything that only looks for "error".
 *
 * @param {string} display
 * @returns {boolean}
 */
export function isFailure(display) {
  const o = display.trim();
  return /^error/i.test(o) || /^Err\(/.test(o);
}

/**
 * Drives MLPL through the playground bundle in a hidden same-origin iframe.
 *
 * TEMPORARY. Replaced wholesale when blocker B7 lands; nothing outside this
 * class knows the iframe exists.
 */
class IframeRuntime {
  /**
   * @param {string} bundleUrl path to the playground's index.html, same-origin
   */
  constructor(bundleUrl) {
    this.bundleUrl = bundleUrl;
    this.bindings = null;
    this.session = null;
    this.frame = null;
    this.preludes = [];
  }

  /** Boot the interpreter. Safe to await more than once. */
  async ready() {
    if (this.session) return;
    this.frame = document.createElement('iframe');
    this.frame.setAttribute('title', 'sw-MLPL interpreter');
    this.frame.hidden = true;
    this.frame.src = this.bundleUrl;
    document.body.appendChild(this.frame);

    const deadline = Date.now() + BOOT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const b = this.frame.contentWindow && this.frame.contentWindow.wasmBindings;
      if (b && b.WasmSession) {
        this.bindings = b;
        this.session = new b.WasmSession();
        return;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error('sw-MLPL did not start: no wasmBindings after ' + BOOT_TIMEOUT_MS + 'ms');
  }

  /**
   * Evaluate MLPL source in the session.
   * @param {string} source
   * @returns {MlplResult}
   */
  eval(source) {
    if (!this.session) throw new Error('runtime not ready');
    const display = this.session.eval(source);
    return { display, failed: isFailure(display) };
  }

  /**
   * Evaluate MLPL whose value is `to_json(...)` and parse the record.
   * @param {string} source
   * @returns {object}
   */
  evalJson(source) {
    const { display } = this.eval(source);
    const payload = unwrapResult(display);
    try {
      return JSON.parse(payload);
    } catch (e) {
      throw new Error('expected a JSON record, got: ' + display.slice(0, 200));
    }
  }

  /**
   * Load source that every later evaluation may rely on, and remember it.
   *
   * The browser session has no `include` (docs/upstream-asks.md #21), so a
   * library crosses as source text and has to be re-evaluated after a reset.
   * @param {string} source
   */
  prelude(source) {
    this.preludes.push(source);
    const { display, failed } = this.eval(source);
    if (failed) throw new Error('prelude failed: ' + display.slice(0, 200));
  }

  /** Drop the environment, then restore the preludes. */
  reset() {
    this.session.clear();
    const sources = this.preludes;
    this.preludes = [];
    sources.forEach(s => this.prelude(s));
  }
}

/**
 * Create the runtime this page should use.
 *
 * @param {string} bundleUrl same-origin path to the playground's index.html
 * @returns {IframeRuntime}
 */
export function createRuntime(bundleUrl) {
  return new IframeRuntime(bundleUrl);
}
