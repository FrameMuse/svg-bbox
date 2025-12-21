import * as SvgBbox from "./bbox"

export function injectSvgBBoxPolyfill(context: typeof globalThis) {
  Object.defineProperty(context.SVGGraphicsElement.prototype, "getBBox", {
    configurable: true,
    writable: true,
    value: function () { return SvgBbox.compute(this) }
  })
}
