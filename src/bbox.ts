/**
 * Implements polyfill for SVG `getBBox` method that can live in isolated environments like NodeJS,
 * where there is no DOM and such Browser APIs.
 * 
 * Very similar solution with other details: https://stackoverflow.com/a/69801747
 */

import type { Font } from "opentype.js"
import { svgPathBbox } from "svg-path-bbox"


export function computeLine(line: SVGLineElement): DOMRect {
  const x1 = parseFloat(line.getAttribute("x1") ?? "0")
  const y1 = parseFloat(line.getAttribute("y1") ?? "0")
  const x2 = parseFloat(line.getAttribute("x2") ?? "0")
  const y2 = parseFloat(line.getAttribute("y2") ?? "0")

  const minX = Math.min(x1, x2)
  const minY = Math.min(y1, y2)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)

  return new DOMRect(minX, minY, width, height)
}

export function computeRect(rect: SVGElement): DOMRect {
  const x = parseFloat(rect.getAttribute("x") || "0")
  const y = parseFloat(rect.getAttribute("y") || "0")

  const width = parseFloat(rect.getAttribute("width") || "0")
  const height = parseFloat(rect.getAttribute("height") || "0")

  return new DOMRect(x, y, width, height)
}

export function computeCircle(circle: SVGElement): DOMRect {
  const cx = parseFloat(circle.getAttribute("cx") || "0")
  const cy = parseFloat(circle.getAttribute("cy") || "0")
  const r = parseFloat(circle.getAttribute("r") || "0")

  return new DOMRect(cx - r, cy - r, 2 * r, 2 * r)
}

export function computeEllipse(ellipse: SVGElement): DOMRect {
  const cx = parseFloat(ellipse.getAttribute("cx") || "0")
  const cy = parseFloat(ellipse.getAttribute("cy") || "0")
  const rx = parseFloat(ellipse.getAttribute("rx") || "0")
  const ry = parseFloat(ellipse.getAttribute("ry") || "0")

  return new DOMRect(cx - rx, cy - ry, 2 * rx, 2 * ry)
}

export function computePoly(poly: SVGElement): DOMRect {
  const points = poly.getAttribute("points")?.trim()
  if (!points) return new DOMRect

  const numberPoints = points.split(/[\s,]+/).map(Number)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i + 1 < numberPoints.length; i += 2) {
    const x = numberPoints[i], y = numberPoints[i + 1]
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    minX = Math.min(minX, x); minY = Math.min(minY, y)
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }
  if (minX === Infinity) return new DOMRect

  return new DOMRect(minX, minY, maxX - minX, maxY - minY)
}

export function computeFont(element: SVGElement): DOMRect {
  const text = element.textContent.replace(/\s+/g, " ")
  if (!text) return new DOMRect

  const cStyle = window.getComputedStyle(element)

  const lineHeight = cStyle.lineHeight === "normal" ? 1.2 : parseFloat(cStyle.lineHeight)

  const fontSize = parseFloat(cStyle.fontSize) || 16
  const fontFamily = cStyle.fontFamily.split(",")[0].replace(/['"]/g, "").trim()

  const font = findFont(fontFamily)
  if (font == null) {
    throw new Error(`Font ${fontFamily} is not found`)
  }

  const path = font.getPath(text, 0, fontSize * lineHeight / 2, fontSize)
  const box = path.getBoundingBox()

  const x = box.x1
  const y = box.y1

  const width = box.x2 - box.x1
  const height = fontSize * lineHeight

  return new DOMRect(x, y, width, height)
}

export function computeTspan(element: SVGElement, relative = new DOMRect): DOMRect {
  if (element.children.length >= 0) return computeFont(element)

  const cStyle = window.getComputedStyle(element)
  const fontSize = parseFloat(cStyle.fontSize) || 16


  const fx = parseValue(element.getAttribute("x"), fontSize)
  const fy = parseValue(element.getAttribute("y"), fontSize)

  const fdx = parseValue(element.getAttribute("dx"), fontSize)
  const fdy = parseValue(element.getAttribute("dy"), fontSize)

  relative.x = fx
  relative.y = fy

  relative.x += fdx
  relative.y += fdy

  const rect = new DOMRect
  for (const child of element.children) {
    const childBox = compute(child as never)
    const childTag = child.tagName.toLowerCase()
    if (childTag === "tspan") {
      const tspanBox = computeTspan(child as never, relative)
      rect.x = Math.min(rect.x, tspanBox.x)
      rect.y = Math.min(rect.y, tspanBox.y)
      rect.width = Math.max(rect.width, tspanBox.x + tspanBox.width - rect.x)
      rect.height = Math.max(rect.height, tspanBox.y + tspanBox.height - rect.y)
    } else {
      rect.x = Math.min(rect.x, childBox.x + relative.x)
      rect.y = Math.min(rect.y, childBox.y + relative.y)
      rect.width = Math.max(rect.width, childBox.x + childBox.width + relative.x - rect.x)
      rect.height = Math.max(rect.height, childBox.y + childBox.height + relative.y - rect.y)
    }
  }


  rect.x += relative.x
  rect.y += relative.y
  rect.width += relative.width
  rect.height += relative.height

  return rect
}

function unionTwoDOMRects(r1: DOMRect | null | undefined, r2: DOMRect): DOMRect
function unionTwoDOMRects(r1: DOMRect, r2: DOMRect | null | undefined): DOMRect
function unionTwoDOMRects(r1?: DOMRect | null, r2?: DOMRect | null): DOMRect {
  if (!r1) return r2!
  if (!r2) return r1

  const x1 = Math.min(r1.x, r2.x)
  const y1 = Math.min(r1.y, r2.y)

  const x2 = Math.max(r1.x + r1.width, r2.x + r2.width)
  const y2 = Math.max(r1.y + r1.height, r2.y + r2.height)

  const rect = new DOMRect(x1, y1, x2 - x1, y2 - y1)

  if (rect.height < 0) rect.height = 0
  if (rect.width < 0) rect.width = 0

  return rect
}

function unionDOMRects(...boxes: DOMRect[]): DOMRect {
  let union = null
  for (const box of boxes) {
    union = unionTwoDOMRects(union, box)
  }

  if (union == null) union = new DOMRect

  return union
}


function parseValue(value: string | undefined | null, fontSize: number): number {
  if (value == null) return 0
  if (value.endsWith("em")) {
    return parseFloat(value) * fontSize
  }

  return parseFloat(value)
}
function parseTransform(transform: string, transformOrigin?: string, parentTransform?: Partial<DOMRect>) {
  const [originX, originY] = transformOrigin?.split(" ").map(parseFloat) ?? [0, 0]

  return computeTransformedBBox(DOMRect.fromRect(parentTransform), transform, new DOMRect(originX, originY))
}

/**
 * Compute transformed bounding box of an element given a CSS transform string.
 * @param rect - The original bounding box (e.g. from getBBox() or getBoundingClientRect()).
 * @param transform - CSS transform string (e.g. "translate(16px, 16px) rotate(45deg) scale(1.5)").
 * @param [origin={x:0,y:0}] - Transform origin pivot in same coordinate space as rect.
 * @returns The transformed bounding box.
 */
export function computeTransformedBBox(rect: Partial<DOMRect>, transform: string, origin: DOMPointInit = { x: 0, y: 0 }) {
  const originTranslateStart = `translate(${origin.x}px, ${origin.y}px)`
  const originTranslateEnd = `translate(-${origin.x}px, -${origin.y}px)`

  const parsableTransform = transform
    .replace(/(-?\d+[.\d]*)/g, "$1px") // Annotate numbers as px.

  const matrix = new DOMMatrix(`${originTranslateStart} ${parsableTransform} ${originTranslateEnd}`)
  return transformRectToAABB(rect, matrix)
}

function transformRectToAABB(rect: Partial<DOMRect>, matrix: DOMMatrix) {
  rect.x ??= 0
  rect.y ??= 0

  rect.width ??= 0
  rect.height ??= 0

  const points = [
    new DOMPoint(rect.x, rect.y),
    new DOMPoint(rect.x + rect.width, rect.y),
    new DOMPoint(rect.x, rect.y + rect.height),
    new DOMPoint(rect.x + rect.width, rect.y + rect.height)
  ].map(p => p.matrixTransform(matrix))

  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)

  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return new DOMRect(minX, minY, maxX - minX, maxY - minY)
}

export function computeBoundingBox(element: SVGElement): DOMRect {
  const tag = element.tagName.toLowerCase()

  // PATH
  if (tag === "path") {
    const d = element.getAttribute("d") || ""

    const [x1, y1, x2, y2] = svgPathBbox(d)
    return new DOMRect(x1, y1, x2 - x1, y2 - y1)
  }

  if (tag === "rect") return computeRect(element)
  if (tag === "circle") return computeCircle(element)
  if (tag === "ellipse") return computeEllipse(element)
  if (tag === "line") return computeLine(element as never)
  if (tag === "text") return computeTspan(element)
  if (tag === "tspan") return computeTspan(element)

  if (tag === "polygon" || tag === "polyline") return computePoly(element)

  return new DOMRect
}

export function compute(element: SVGElement, parentTransform = new DOMRect): DOMRect {
  const localTransform = parseTransform(
    element.getAttribute("transform") ?? "",
    element.getAttribute("transform-origin") ?? "",
    parentTransform
  )

  const tag = element.tagName.toLowerCase()
  if (tag === "g" || tag === "svg") {
    return unionDOMRects(...Array.from(element.children).map(x => compute(x as never, localTransform)))
  }

  // Will compute `text` box if it contains only text.
  const rect = computeBoundingBox(element)

  rect.x += localTransform.x
  rect.y += localTransform.y
  rect.width += localTransform.width
  rect.height += localTransform.height

  return rect
}

// eslint-disable-next-line prefer-const
export let fonts: Record<string, Font> = {}


function findFont(cssFontFamily: string): Font | null {
  if (!cssFontFamily) return null
  // take first family token, lowercased, trimmed, strip quotes
  const family = cssFontFamily.split(",")[0].replace(/['"]/g, "").trim().toLowerCase()
  return fonts[family] ?? fonts.default ?? null
}
