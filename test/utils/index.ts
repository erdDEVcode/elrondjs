import _ from 'lodash'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

chai.should()
require('./chai-assertions').addAssertions(chai)
chai.use(chaiAsPromised)

export const expect = chai.expect
export const assert = chai.assert
export const PROXY_ENDPOINT = 'http://localhost:7950'

