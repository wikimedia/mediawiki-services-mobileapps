// separate this out so it is only compiled once
const styleRegex = /(-?\d*\.?\d*)(\D+)?/

/** CSS length value and unit of measure. */
class DimensionUnit {
  /**
   * Returns the dimension and units of an Element, usually width or height, as specified by inline
   * style or attribute. This is a pragmatic not bulletproof implementation.
   * @param {!Element} element
   * @param {!string} property
   * @return {?DimensionUnit}
   */
  static fromElement(element, property) {
    return element.style.getPropertyValue(property)
      && DimensionUnit.fromStyle(element.style.getPropertyValue(property))
      || element.hasAttribute(property) && new DimensionUnit(element.getAttribute(property))
      || undefined
  }
  /**
   * This is a pragmatic not bulletproof implementation.
   * @param {!string} property
   * @return {!DimensionUnit}
   */
  static fromStyle(property) {
    const matches = property.match(styleRegex) || []
    return new DimensionUnit(matches[1], matches[2])
  }

  /**
   * @param {!string} value
   * @param {?string} unit Defaults to pixels.
   */
  constructor(value, unit) {
    this._value = Number(value)
    this._unit = unit || 'px'
  }

  /** @return {!number} NaN if unknown. */
  get value() { return this._value }

  /** @return {!string} */
  get unit() { return this._unit }

  /** @return {!string} */
  toString() {
    return isNaN(this.value) ? '' : `${this.value}${this.unit}`
  }
}

/** Element width and height dimensions and units. */
export default class ElementGeometry {
  /**
   * @param {!Element} element
   * @return {!ElementGeometry}
   */
  static from(element) {
    return new ElementGeometry(DimensionUnit.fromElement(element, 'width'),
      DimensionUnit.fromElement(element, 'height'))
  }

  /**
   * @param {?DimensionUnit} width
   * @param {?DimensionUnit} height
   */
  constructor(width, height) {
    this._width = width
    this._height = height
  }

  /**
   * @return {?DimensionUnit}
   */
  get width() { return this._width }

  /** @return {!number} NaN if unknown. */
  get widthValue() { return this._width && !isNaN(this._width.value) ? this._width.value : NaN }

  /** @return {!string} */
  get widthUnit() { return this._width && this._width.unit || 'px' }

  /**
   * @return {?DimensionUnit}
   */
  get height() { return this._height }

  /** @return {!number} NaN if unknown. */
  get heightValue() { return this._height && !isNaN(this._height.value) ? this._height.value : NaN }

  /** @return {!string} */
  get heightUnit() { return this._height && this._height.unit || 'px' }
}