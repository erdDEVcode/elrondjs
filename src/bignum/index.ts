import { Decimal } from 'decimal.js'

const PreciseDecimal = Decimal.clone({ defaults: true, toExpPos: 33 })

/**
 * Convert input to `PreciseDecimal` instance.
 * @param a Input of any type.
 * @internal
 */
const toDecimal = (a: any): Decimal => {
  if (a) {
    if (a._hex) {
      a = a._hex
    } else if (a._isBigNumber) {
      a = a.toString(10)
    }
  }

  return new PreciseDecimal(`${a}`)
}

/**
 * Convert input to `PreciseDecimal` instance based on the scale given in the reference value. 
 * 
 * @param input Input value.
 * @param reference Reference value.
 * @internal
 */
const toDecimalAtOriginalScale = (input: any, reference: BigNum): Decimal => (
  input._n ? input.toScale(reference.scale)._n : toDecimal(input)
)

/**
 * The scale of a `BigNum` instance.
 */
export enum BigNumScale {
  SMALLEST = 0,
  NORMAL = 1,
}


/**
 * `BigNum` configuration.
 */
export interface BigNumConfig {
  /**
   * No. of decimals values will have. Default is 18.
   */
  decimals?: number
}



/**
 * Represents an arbitrarily large or small number with decimals.
 * 
 * At any given time a `BigNum` instance operates at a particular number _scale_. The scale is based on the 
 * the no. of `decimals` specified in the configuration (`BigNumConfig`). The `BigNumScale.SMALLEST` scale 
 * is for numbers which are do not have decimal places since they are already denominated in the smallest 
 * possible unit. The `BigNumScale.NORMAL` scale is for numbers which implicitly have decimal places.
 * 
 * For example, if a given `BigNum` has `decimals = 2` then the following two numbers are equivalent in value:
 * 
 * - BigNumScale.SMALLEST, value = 100
 * - BigNumScale.NORMAL, value = 1
 * 
 * If `decimals` is 18 (this is the default) then the following two numbers are equivalent in value:
 * 
 * - BigNumScale.SMALLEST, value = 1000000000000000000
 * - BigNumScale.NORMAL, value = 1
 * 
 * The use of scales like this makes it easy to perform arithmetic at the desired precision.
 * 
 * All the arithmetic methods are immutable, i.e. they return a new `BigNum` instance, leaving the original inputs unchanged.
 */
export default class BigNum {
  _n: Decimal
  _scale: BigNumScale
  _config: BigNumConfig
  // these will be set in the constructor
  mul: any
  sub: any
  div: any
  add: any
  gt: any
  gte: any
  lt: any
  lte: any
  eq: any

  /**
   * @constructor
   * @param src Input number. If this is a `BigNum` instance then `scale` and `config` parameters will be ignored.
   * @param scale The scale of the input number.
   * @param config Custom configuration for this instance.
   */
  constructor (src: any, scale: BigNumScale = BigNumScale.SMALLEST, config: BigNumConfig = { decimals: 18 }) {
    if (src instanceof BigNum) {
      this._n = toDecimal(src._n)
      this._scale = src.scale
      this._config = src.config
    } else {
      this._n = toDecimal(src)
      this._scale = scale
      this._config = config
    }

    ;['mul', 'sub', 'div', 'add'].forEach(method => {
      (this as any)[method] = (v: any) => (
        new BigNum((this._n as any)[method].call(this._n, toDecimalAtOriginalScale(v, this)), this._scale, this._config)
      )
    })

    ;['gt', 'gte', 'lt', 'lte', 'eq'].forEach(method => {
      (this as any)[method] = (v: any) => (
        (this._n as any)[method].call(this._n, toDecimalAtOriginalScale(v, this))
      )
    })
  }

  /**
   * Get current scale.
   */
  get scale (): BigNumScale {
    return this._scale
  }

  /**
   * Get config.
   */
  get config (): BigNumConfig {
    return this._config
  }

  /**
   * Multiply by 10 to the power given input value.
   * @param v The power of 10.
   */
  scaleDown(v: any): BigNum {
    return this.mul(toDecimal(10).pow(toDecimal(v)))
  }

  /**
   * Divide by 10 to the power given input value.
   * @param v The power of 10.
   */
  scaleUp(v: any): BigNum {
    return this.div(toDecimal(10).pow(toDecimal(v)))
  }

  /**
   * Round to the nearest whole number.
   */
  round (): BigNum {
    return new BigNum(this._n.toDecimalPlaces(0), this._scale, this._config)
  }

  /**
   * Convert to smallest scale.
   */
  toSmallestScale (): BigNum {
    if (this._scale === BigNumScale.SMALLEST) {
      return this
    } else {
      const n = this.scaleDown(this._config.decimals)
      n._scale = BigNumScale.SMALLEST
      return n
    }
  }

  /**
   * Convert to normal scale.
   */
  toNormalScale(): BigNum {
    if (this._scale === BigNumScale.NORMAL) {
      return this
    } else {
      const n = this.scaleUp(this._config.decimals)
      n._scale = BigNumScale.NORMAL
      return n
    }
  }

  /**
   * Convert to given scale.
   * 
   * @param scale Scale to convert to.
   */
  toScale(scale: BigNumScale): BigNum {
    switch (scale) {
      case BigNumScale.SMALLEST:
        return this.toSmallestScale()
      case BigNumScale.NORMAL:
        return this.toNormalScale()
      default:
        throw new Error(`Unrecognized scale: ${scale}`)
    }
  }

  /**
   * Get string representation in given base.
   * 
   * @param base Base to represent in. Default is 10.
   */
  toString (base: number = 10) {
    switch (base) {
      case 2: {
        let str = this._n.toBinary()
        str = str.substr(str.indexOf('b') + 1)
        return str
      }
      case 16: {
        return this._n.toHexadecimal()
      }
      default:
        return this._n.toString()
    }
  }

  /**
   * Get base-10 string representation to given no. of decimal places.
   * @param numDecimals No. of decimal places to show.
   */
  toFixed(numDecimals: number) {
    return this._n.toFixed(numDecimals)
  }

  /**
   * Get base-10 number representation.
   */
  toNumber() {
    return this._n.toNumber()
  }
}