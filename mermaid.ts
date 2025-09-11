import type { MermaidConfig } from "mermaid"

import injectSvgBBoxPolyfill from "./bbox"
import injectDOMCanvasPolyfill from "./canvas"
import { injectDOMPolyfill } from "./dom"
import injectDOMPointPolyfill from "./DOMPoint"
import { preloadFonts } from "./font-load"

await preloadFonts()

injectDOMPolyfill(globalThis)
injectDOMCanvasPolyfill()
injectDOMPointPolyfill()
injectSvgBBoxPolyfill()

const { default: mermaid } = await import("mermaid")


const mermaidConfig: MermaidConfig = {
  startOnLoad: false,
  wrap: true,
  markdownAutoWrap: true,
  securityLevel: "loose",
  htmlLabels: false,
  flowchart: { htmlLabels: false },
  gantt: {
    barGap: 15,
    useWidth: window.innerWidth
  }
}
mermaid.initialize(mermaidConfig)


function fixMermaidSVG(value: string,
  diagramType: string): string {
  if (diagramType === "radar" || diagramType === "packet") {
    // Fix `viewBox` typo.
    value = value.replace("viewbox", "viewBox").replace(/height=".*?" /, "").replace(/width=".*?"/, `width="100%"`)
  }

  // Fix not emitted background class with disabled html labels.
  value = value.replace(/\.labelBkg{background-color/g, ".background{fill")

  // value = decodeHTMLEntities(value)
  return value
}

async function renderMermaid(id: string, code: string) {
  const { svg, diagramType } = await mermaid.render(id, code)

  return fixMermaidSVG(svg, diagramType)
}

export default renderMermaid
