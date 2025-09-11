import fs from "fs"
import opentype, { Font } from "opentype.js"
import * as path from "path"

const FONT_MAP = {
  // Fill these with absolute or relative paths to .ttf/.otf files on your machine/server.
  // You can substitute a single good sans font for all of them if you do not have originals.
  // Example: use DejaVuSans (commonly available) as a decent generic fallback.
  "trebuchet ms": path.join(__dirname, "../public/fonts", "trebuchetms.ttf"),
  "verdana": path.join(__dirname, "../public/fonts", "InterTight-VariableFont_wght.ttf"),
  "arial": path.join(__dirname, "../public/fonts", "InterTight-VariableFont_wght.ttf"),
  "sans-serif": path.join(__dirname, "../public/fonts", "InterTight-VariableFont_wght.ttf"),
}
// -------------------------------------------------------------------------

// Quick existence check and warning
for (const k of Object.keys(FONT_MAP)) {
  if (!fs.existsSync(FONT_MAP[k])) {
    throw new Error(`font file for "${k}" not found at: ${FONT_MAP[k]}. Using fallback heuristics.`)
    // Do not abort; getBBox will fall back to heuristics if font not loaded.
  }
}

// ---------- Font loading and cache ----------
const fontCache = {} // familyLower -> opentype font or null

export async function preloadFonts() {
  const loadPromises = Object.entries(FONT_MAP).map(async ([family, fpath]) => {
    const key = family.toLowerCase()
    if (!fpath || !fs.existsSync(fpath)) {
      fontCache[key] = null
      return
    }
    try {
      const font = await opentype.load(fpath) // returns opentype.Font
      fontCache[key] = font
      // console.log(`[INFO] Loaded font for "${family}" from ${fpath}`);
    } catch (err) {
      console.warn(`[WARN] Failed to load font for "${family}": ${err.message}`)
      fontCache[key] = null
    }
  })
  await Promise.all(loadPromises)
}

// Utility: pick font by CSS font-family string
export function findFontForFamily(cssFontFamily): Font | null {
  if (!cssFontFamily) return null
  // take first family token, lowercased, trimmed, strip quotes
  const family = cssFontFamily.split(",")[0].replace(/['"]/g, "").trim().toLowerCase()
  if (fontCache[family]) return fontCache[family]
  // try fallback keys: strip spaces (e.g., "trebuchet ms" -> "trebuchet ms")
  if (fontCache[family]) return fontCache[family]
  // fallback to any 'sans-serif' mapping
  if (fontCache["sans-serif"]) return fontCache["sans-serif"]
  // no font loaded
  return null
}
