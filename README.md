# svg-bbox-polyfill

Provides a polyfill for SVG elements in environments where `getBBox` is not available.

<a href="https://www.npmjs.com/package/svg-bbox-polyfill">
  <img src="https://img.shields.io/npm/v/svg-bbox-polyfill?color=007ec6" />
  <img alt="npm package minimized gzipped size" src="https://img.shields.io/bundlejs/size/svg-bbox-polyfill">
</a>
<a href="http://commitizen.github.io/cz-cli/"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen friendly" /></a>

Provides a set of utils to calculate the bounding box of SVG paths and shapes, by using `DOMRect`, `DOMMatrix`, `DOMPoint` and pure math calculations.

## Installation

As this packges only polyfills `getBBox`, it still requires other DOM APIs.
Installing [`happy-dom`](https://npmjs.com/package/happy-dom) or [`jsdom`](https://npmjs.com/package/jsdom) is recommended for non-browser environments.

```bash
npm i svg-bbox-polyfill happy-dom
```

### Missing `DOMPoint.prototype.matrixTransform`

It's also very likely you're missing `DOMPoint.prototype.matrixTransform` (even with `happy-dom`).
In that case, you can use `injectDOMPointPolyfill` from this package or any other polyfill.

## Preparation

Inject the polyfill for `DOMPoint.prototype.matrixTransform`:

```js
import { injectDOMPointPolyfill } from "svg-bbox-polyfill"

injectDOMPointPolyfill(globalThis) // In case `matrixTransform` is missing.
```

Register fonts used in SVGs (required for text elements):

```js
import opentype from "opentype.js"
import { SvgBbox } from "svg-bbox-polyfill"

// Use `opentype.js` or anything that returns `opentype.Font` interface.
SvgBbox.fonts = {
  "Arial": await opentype.load("path/to/Arial.ttf"),
  "Times New Roman": opentype.loadSync("path/to/TimesNewRoman.ttf"),
}
```

## Usage

Compute the bounding box of an SVG element without polyfilling:

```js
import { SvgBbox, injectDOMPointPolyfill } from "svg-bbox-polyfill"

injectDOMPointPolyfill(globalThis) // In case `matrixTransform` is missing. Apply before `SvgBbox.compute`.

SvgBbox.compute(svgElement)

// Other utils:
SvgBbox.computeLine(lineElement)
SvgBbox.computeRect(rectElement)
SvgBbox.computeCircle(circleElement)
SvgBbox.computeEllipse(ellipseElement)
SvgBbox.computePoly(polyElement)
SvgBbox.computeFont(fontElement)
SvgBbox.computeTspan(tspanElement)
SvgBbox.computeTransformedBBox(lineElement)
SvgBbox.computeBoundingBox(rect, transform, origin) // Read inline docs for more details.
```

Inject the polyfill for `SVGGraphicsElement` (base class for all SVG elements):

```js
import { injectSvgBBoxPolyfill, injectDOMPointPolyfill } from "svg-bbox-polyfill"

injectDOMPointPolyfill(globalThis) // In case `matrixTransform` is missing. Apply before `injectSvgBBoxPolyfill`.
injectSvgBBoxPolyfill(globalThis)

svgElement.getBBox()
```

## Application

This polyfill can be used in various scenarios, such as:

- Server-side rendering of SVGs
- Testing SVG-related code in non-browser environments

### Mermaid Rendering

One of the main use cases of this polyfill is to enable rendering of Mermaid diagrams in server-side environments **without** tools like Puppeteer or Playwright (`@mermaid-js/mermaid-cli` is also based on Puppeteer).

Mermaid relies on `getBBox` to calculate the size and position of SVG elements when rendering diagrams. However, it also relies on other DOM APIs like Canvas, so looks at [mermaid-svg-native](https://npmjs.com/package/mermaid-svg-native) library.
