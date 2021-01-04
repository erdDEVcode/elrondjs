import Elrond from '@elrondnetwork/elrond-core-js'
import { Buffer } from 'buffer'
import createKeccakHash from 'keccak'
import { BigVal } from 'bigval'

import { ContractMetadata } from '../common'

/**
 * Common argument delimiter in elrond.
 */
export const ARGS_DELIMITER = '@'

/**
 * Arwen VM indicator value.
 */
export const ARWEN_VIRTUAL_MACHINE = '0500'


/**
 * Convert ASCII string to its HEX representation.
 * @param arg ASCII string.
 */
export const stringToHex = (arg: string): string => {
  return arg.split('').map(c => ('0' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
}


/**
 * Convert number to its HEX representation.
 * 
 * This will prefix the returned string with `0`'s in order to ensure an even length.
 * 
 * @param arg number.
 */
export const numberToHex = (arg: any): string => {
  let str = new BigVal(arg).toString(16).substr(2)
  if (str.length % 2 !== 0) {
    str = `0${str}`
  }
  return str
}



/**
 * Get KECCAK hash of given input
 * @param bytes The input.
 */
export const keccak = (bytes: Buffer): Buffer => {
  return createKeccakHash("keccak256").update(bytes).digest()  
}


/**
 * Get string representation of given contract metadata.
 * 
 * (Forked from https://github.com/ElrondNetwork/elrond-sdk/blob/master/erdjs/src/smartcontracts/codeMetadata.ts)
 * 
 * @param contractMetadata Contract metadata.
 */
export const contractMetadataToString = (contractMetadata: ContractMetadata): string => {
  let byteZero = 0
  let byteOne = 0

  if (contractMetadata.upgradeable) {
    byteZero |= 1
  }
  if (contractMetadata.readable) {
    byteZero |= 4
  }
  if (contractMetadata.payable) {
    byteOne |= 2
  }

  return `0${byteZero}0${byteOne}`
}


/**
 * Get hex representation of given bech32 address.
 * 
 * @param address The address in bech32 format.
 */
export const addressToHexString = (address: string): string => {
  const a = new Elrond.account()
  return a.hexPublicKeyFromAddress(address)
}


/**
 * Get bech32 address from its hex representation.
 * 
 * @param hex The address in hex format.
 */
export const hexStringToAddress = (hex: string): string => {
  const a = new Elrond.account()
  return a.addressFromHexPublicKey(hex)
}



/**
 * The NULL address in HEX format.
 */
export const ADDRESS_ZERO_HEX = '0'.repeat(64)


/**
 * The NULL address in bech32 format.
 */
export const ADDRESS_ZERO_BECH32 = 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu' // = hexStringToAddress(ADDRESS_ZERO_HEX)

