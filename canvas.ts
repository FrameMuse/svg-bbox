import { createCanvas } from "canvas"

function injectDOMCanvasPolyfill() {
  const oldCreateElement = globalThis.document.createElement.bind(globalThis.document)
  globalThis.document.createElement = (tagName, options) => {
    const element = oldCreateElement(tagName, options)

    if (tagName.toLowerCase() === "canvas") {
      // Backing surface from node-canvas
      let canvas = createCanvas(300, 150)

      // Width / height as DOM attributes
      Object.defineProperty(element, "width", {
        get: () => canvas.width,
        set: (w) => { canvas = createCanvas(w, canvas.height) },
      })

      Object.defineProperty(element, "height", {
        get: () => canvas.height,
        set: (h) => { canvas = createCanvas(canvas.width, h) },
      })

      // Canvas API methods
      element.getContext = (type, opts) => canvas.getContext(type, opts)
      // @ts-expect-error rest params.
      element.toDataURL = (...args) => canvas.toDataURL(...args)
      // @ts-expect-error rest params.
      element.toBuffer = (...args) => canvas.toBuffer(...args)
      element.toString = () => "[object HTMLCanvasElement]"

      return element
    }

    return element
  }
}

export default injectDOMCanvasPolyfill
