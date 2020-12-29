import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
chai.should()

export const expect = chai.expect
export const assert = chai.assert
export const PROXY_ENDPOINT = 'http://localhost:7950'

