function injectDOMPointPolyfill() {
  DOMPoint.prototype.matrixTransform ??= function (matrix) {
    // We assume 'matrix' is a DOMMatrix or compatible object with a toFloat32Array or properties
    const m = matrix // alias

    // Point in homogeneous coordinates:
    const x = this.x
    const y = this.y
    const z = this.z ?? 0
    const w = this.w ?? 1

    // Matrix entries: DOMMatrix uses column-major [a, b, c, d, e, f, m41, m42, m43, m44...]
    // but its transformPoint expects m11, m12, ..., m44
    const m11 = m.a ?? m.m11
    const m12 = m.b ?? m.m12
    const m21 = m.c ?? m.m21
    const m22 = m.d ?? m.m22
    const m41 = m.e ?? m.m41
    const m42 = m.f ?? m.m42

    // For 3D:
    const m13 = m.m13 ?? 0
    const m23 = m.m23 ?? 0
    const m31 = m.m31 ?? 0
    const m32 = m.m32 ?? 0
    const m33 = m.m33 ?? 1
    const m43 = m.m43 ?? 0
    const m14 = m.m14 ?? 0
    const m24 = m.m24 ?? 0
    const m34 = m.m34 ?? 0
    const m44 = m.m44 ?? 1

    // Compute result in homogeneous:
    const x2 = m11 * x + m21 * y + m31 * z + m41 * w
    const y2 = m12 * x + m22 * y + m32 * z + m42 * w
    const z2 = m13 * x + m23 * y + m33 * z + m43 * w
    const w2 = m14 * x + m24 * y + m34 * z + m44 * w

    // Normalize if needed:
    const invW = w2 !== 0 ? 1 / w2 : 1

    // Return transformed point as DOMPoint (mutable)
    return new DOMPoint(
      x2 * invW,
      y2 * invW,
      z2 * invW,
      w2
    )
  }
}

export default injectDOMPointPolyfill
