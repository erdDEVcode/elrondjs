const _ = require('lodash')

exports.addAssertions = chai => {
  chai.use((_chai, utils) => {
    const sanitizeResultVal = (result, val) => {
      // if bignumber/bigval
      if (_.get(result, 'toNumber') || _.get(val, 'toNumber')) {
        result = `${result}`
        val = `${val}`
      }

      return [result, val]
    }

    utils.addMethod(_chai.Assertion.prototype, 'eq', function (val) {
      let result = utils.flag(this, 'object')

      if (result instanceof Array && val instanceof Array) {
        const newResult = []
        const newVal = []

        for (let i = 0; result.length > i || val.length > i; i += 1) {
          const [r, v] = sanitizeResultVal(result[i], val[i])
          newResult.push(r)
          newVal.push(v)
        }

        const newResultStr = newResult.join(', ')
        const newValStr = newVal.join(', ')

        return (utils.flag(this, 'negate'))
          ? new _chai.Assertion(newResultStr).to.not.be.equal(newValStr)
          : new _chai.Assertion(newResultStr).to.be.equal(newValStr)

      } else {
        const [r, v] = sanitizeResultVal(result, val)

        return (utils.flag(this, 'negate'))
          ? new _chai.Assertion(r).to.not.be.equal(v)
          : new _chai.Assertion(r).to.be.equal(v)
      }
    })

    utils.addMethod(_chai.Assertion.prototype, 'matchObj', function (val) {
      let result = utils.flag(this, 'object')

      if (result instanceof Object) {
        const newResult = {}
        const newVal = {}

        Object.keys(result).forEach(i => {
          const [r, v] = sanitizeResultVal(result[i], val[i])
          if (typeof r !== 'undefined') {
            newResult[i] = r
          }
          if (typeof v !== 'undefined') {
            newVal[i] = v
          }
        })

        return (utils.flag(this, 'negate'))
          ? new _chai.Assertion(newResult).to.not.contain(newVal)
          : new _chai.Assertion(newResult).to.contain(newVal)

      } else {
        throw new Error('Not an object', result)
      }
    })
  })
}
