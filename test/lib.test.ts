import { expect } from './utils'
import { addressToHexString, hexStringToAddress, stringToHex, numberToHex, keccak, contractMetadataToString } from '../src'

describe('Lib utils', () => {
  it('address -> hex', async () => {
    expect(addressToHexString('erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht')).to.eql('5e09f7449582895898307e25c6201f50bed2f459ae3d6e6b36be45c89561ea28')
  })

  it('hex -> address', async () => {
    expect(hexStringToAddress('5e09f7449582895898307e25c6201f50bed2f459ae3d6e6b36be45c89561ea28')).to.eql('erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht')
  })

  it('string -> hex', async () => {
    expect(stringToHex('this is a test')).to.eql('7468697320697320612074657374')
  })

  it('number -> hex', async () => {
    expect(numberToHex(666)).to.eql('029a')
    expect(numberToHex(10000)).to.eql('2710')
  })

  it('keccak', async () => {
    expect(keccak(Buffer.from('The Real Slim Satoshi', 'utf-8')).toString('hex')).to.eql('ea608c0adee96ff55b8bf4220cc083a0653febbbf423da381d8f350748d61de4')
  })

  it('contract metadata -> string', async () => {
    const _str = (a: number[]) => `0${a[0]}0${a[1]}`

    expect(contractMetadataToString({})).to.eql(_str([0, 0]))
    expect(contractMetadataToString({ upgradeable: true })).to.eql(_str([1, 0]))
    expect(contractMetadataToString({ readable: true })).to.eql(_str([4, 0]))
    expect(contractMetadataToString({ payable: true })).to.eql(_str([0, 2]))
    expect(contractMetadataToString({ upgradeable: false, readable: true, payable: true })).to.eql(_str([4, 2]))
    expect(contractMetadataToString({ upgradeable: true, readable: true, payable: true })).to.eql(_str([5, 2]))
    expect(contractMetadataToString({ upgradeable: true, readable: false, payable: true })).to.eql(_str([1, 2]))
    expect(contractMetadataToString({ upgradeable: true, readable: true, payable: false })).to.eql(_str([5, 0]))
  })
})
