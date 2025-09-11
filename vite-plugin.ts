import { optimize } from "svgo"
import { Plugin } from "vite"

import renderMermaid from "./server/mermaid"


function optimizeSvgExtra(value: string): string {
  value = value.replaceAll("\n", "")
  value = trimSvgClasses(value)
  value = trimUseless(value)
  value = optimizeSvg(value)

  return value
}

function optimizeSvg(value: string): string {
  return optimize(value, {
    floatPrecision: 2,
    multipass: false,
  }).data
}

function trimUseless(value: string): string {
  const offset = value.indexOf("xmlns")
  const offsetStart = value.substring(0, offset)

  return offsetStart + value.substring(offset).replace(/( xmlns=".*?")/g, "").replace(/( aria-\w=".*?")/g, "")
}

function trimSvgClasses(svg: string): string {
  // 1. Extract <style> content
  const styleMatch = svg.match(/<style>([\s\S]+?)<\/style>/i)
  const styleContent = styleMatch[1] ?? ""

  // 2. Collect all class names defined in CSS selectors
  // Matches ".foo", ".bar", but ignores things like "#id", tags, etc.
  const classRegex = /\.([\w-]+)/g
  const allowed = new Set<string>(styleContent.match(classRegex))

  // 3. Replace class="..." attributes
  const result = svg.replace(/ class="([^"]*?)"/g, (_, classValue: string) => {
    const kept = classValue
      .split(/\s+/)
      .filter(c => allowed.has(c))

    return kept.length > 0 ? ` class="${kept.join(" ")}"` : ""
  })

  return result
}

function hash(value: string) {
  // FNV-1a 32-bit
  let h = 2166136261 >>> 0
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h = h >>> 0

  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-"
  const alphabetSize = alphabet.length

  let out = ""
  for (let i = 0; i < 8; i++) {
    out += alphabet[h % alphabetSize]
    h = Math.floor(h / alphabetSize)
  }
  return out
}

function mdxMermaidReplace(): Plugin {
  const files: Record<number, string> = {}

  const bundle = true
  const getSvgBundle = () => `<svg xmlns="http://www.w3.org/2000/svg">` + (Object.values(files).join("\n")) + `</svg>`

  return {
    name: "mdxMermaidReplace",
    enforce: "pre",

    configureServer(server) {
      if (bundle) {
        server.middlewares.use("/assets/mermaids.svg", (req, res) => {
          res.setHeader("Content-Type", "image/svg+xml")
          res.end(getSvgBundle())
        })
        return
      }

      server.middlewares.use("/assets/mermaids", (req, res) => {
        const fileId = parseInt(req.url.substring(1))
        if (fileId in files === false) {
          res.setHeader("Content-Type", "image/svg+xml")
          res.end(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 16" width="100%" height="100%"><g><text fill="black">Mermaid SVG Not Found</text></g></svg>`)
          return
        }

        res.setHeader("Content-Type", "image/svg+xml")
        res.end(files[fileId])
      })
    },

    generateBundle() {
      Object.entries(files).forEach(([fileId, source]) => {
        console.log("\n")
        console.log("%c ✨ [vite-mermaid]", "color: #286bb9ff")

        const optimizedSource = optimizeSvgExtra(source)
        console.log(`mermaids/${fileId}.svg optimized: `, (Buffer.byteLength(optimizedSource, "utf-8") / Buffer.byteLength(source, "utf-8") * 100).toFixed(2) + "%")

        this.emitFile({
          type: "asset",
          fileName: `assets/mermaids/${fileId}.svg`,
          source: optimizedSource
        })
      })
    },

    async transform(code, id) {
      if (!id.endsWith(".mdx")) return

      const fileId = hash(code)

      const promises = code.matchAll(/```mermaid\n+(.*?)\n+```/gs).map(async (match, index) => {
        if (match == null) return

        const $0 = match[0]
        const $1 = match[1]

        const svg = await renderMermaid("mermaid" + index, $1)

        files[fileId] += svg
        code = code.replace($0, `<svg><use href="/assets/mermaids.svg#mermaid${index}"></use></svg>`)
      })

      files[fileId] = `<svg xmlns="http://www.w3.org/2000/svg">`
      await Promise.all(promises)
      files[fileId] += `</svg>`

      return code
    }
  }
}

export default mdxMermaidReplace
