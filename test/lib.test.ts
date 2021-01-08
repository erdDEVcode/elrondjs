import { expect } from './utils'
import { addressToHexString, hexStringToAddress, stringToHex, numberToHex, keccak, contractMetadataToString } from '../src'
import { BigVal, BigValScale } from 'bigval'

describe('Lib utils', () => {
  it('address -> hex', async () => {
    expect(addressToHexString('erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht')).to.eq('5e09f7449582895898307e25c6201f50bed2f459ae3d6e6b36be45c89561ea28')
  })

  it('hex -> address', async () => {
    expect(hexStringToAddress('5e09f7449582895898307e25c6201f50bed2f459ae3d6e6b36be45c89561ea28')).to.eq('erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht')
  })

  it('string -> hex', async () => {
    expect(stringToHex('this is a test')).to.eq('7468697320697320612074657374')
  })

  it('number -> hex', async () => {
    expect(numberToHex(666)).to.eq('029a')
    expect(numberToHex(10000)).to.eq('2710')
    expect(numberToHex(new BigVal(255))).to.eq('ff')
    expect(numberToHex(new BigVal(255, BigValScale.NORMAL))).to.eq('0dd2d5fcf3bc9c0000')
  })

  it('keccak', async () => {
    expect(keccak(Buffer.from('The Real Slim Satoshi', 'utf-8')).toString('hex')).to.eq('ea608c0adee96ff55b8bf4220cc083a0653febbbf423da381d8f350748d61de4')
  })

  it('contract metadata -> string', async () => {
    const _str = (a: number[]) => `0${a[0]}0${a[1]}`

    expect(contractMetadataToString({})).to.eq(_str([0, 0]))
    expect(contractMetadataToString({ upgradeable: true })).to.eq(_str([1, 0]))
    expect(contractMetadataToString({ readable: true })).to.eq(_str([4, 0]))
    expect(contractMetadataToString({ payable: true })).to.eq(_str([0, 2]))
    expect(contractMetadataToString({ upgradeable: false, readable: true, payable: true })).to.eq(_str([4, 2]))
    expect(contractMetadataToString({ upgradeable: true, readable: true, payable: true })).to.eq(_str([5, 2]))
    expect(contractMetadataToString({ upgradeable: true, readable: false, payable: true })).to.eq(_str([1, 2]))
    expect(contractMetadataToString({ upgradeable: true, readable: true, payable: false })).to.eq(_str([5, 0]))
  })
})
