import { Window } from "happy-dom"




export function injectDOMPolyfill(context: typeof globalThis) {
  const window = new Window({
    width: 1300,
    height: 1080,

    url: "http://localhost:5000",
    settings: {
      disableComputedStyleRendering: false,
      disableCSSFileLoading: true,
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      handleDisabledFileLoadingAsSuccess: true,
    }
  })

  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in context) continue

    try {
      context[key] = window[key]
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // skip
    }
  }

  context.requestAnimationFrame = (callback: (a: number) => void) => { callback(1); return 2 }
}
