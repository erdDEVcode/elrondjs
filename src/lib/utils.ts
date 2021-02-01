import bech32 from 'bech32'
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
 * Convert Hex string to its ASCII representation.
 * @param arg hex string.
 */
export const hexToString = (arg: string): string => {
  return Buffer.from(arg, 'hex').toString('utf8')
}



/**
 * Convert number to its HEX representation.
 * 
 * This will prefix the returned string with `0`'s in order to ensure an even length.
 * 
 * If `number` is a `BigVal` then it will be converted to its smallest scale prior to generating a hex representation.
 * 
 * @param arg number.
 */
export const numberToHex = (arg: any): string => {
  let str = new BigVal(arg).toMinScale().toString(16).substr(2)
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
  const { words } = bech32.decode(address, 256)
  return Buffer.from(bech32.fromWords(words)).toString('hex')
}


/**
 * Get bech32 address from its hex representation.
 * 
 * @param hex The address in hex format.
 */
export const hexStringToAddress = (hex: string): string => {
  const words = bech32.toWords(Buffer.from(hex, 'hex'));
  return bech32.encode('erd', words)
}


/**
 * Max no. of shards.
 */
export const NUM_SHARDS = 3


/**
 * Get shard number for given address.
 * @param address The address in bech32 format.
 * @param numShards The no. of shards in the network.
 * @return -1 if metachain, >=0 otherwise
 */
export const getShard = (address: string, numShards: number = NUM_SHARDS): number => {
  /* derived from https://github.com/ElrondNetwork/elrond-sdk/blob/721b587d849c0af659e3697ae3c06e084d9916d6/examples/shards.js */

  const pubKey = Buffer.from(addressToHexString(address), "hex")

  if (isMetachainAddress(pubKey)) {
    return -1
  }

  const lastByteOfPubKey = pubKey[31]

  let maskHigh = parseInt("11", 2);
  let maskLow = parseInt("01", 2);

  let shard = lastByteOfPubKey & 3
  if (shard > numShards - 1) {
    shard = lastByteOfPubKey & 1
  }

  return shard
}


/**
 * Forked from https://github.com/ElrondNetwork/elrond-sdk/blob/721b587d849c0af659e3697ae3c06e084d9916d6/examples/shards.js
 * @internal
 */
const isMetachainAddress = (pubKey: Buffer): boolean => {
  let metachainPrefix = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  let pubKeyPrefix = pubKey.slice(0, metachainPrefix.length)
  if (pubKeyPrefix.equals(metachainPrefix)) {
    return true
  }

  let zeroAddress = Buffer.alloc(32).fill(0)
  if (pubKey.equals(zeroAddress)) {
    return true
  }

  return false
}



/**
 * The NULL address in HEX format.
 */
export const ADDRESS_ZERO_HEX = '0'.repeat(64)


/**
 * The NULL address in bech32 format.
 */
export const ADDRESS_ZERO_BECH32 = 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu' // = hexStringToAddress(ADDRESS_ZERO_HEX)



/**
 * Convert query result value to hex.
 * @internal
 */
export const queryResultValueToHex = (val: string) => Buffer.from(val, 'base64').toString('hex')

/**
 * Convert query result value to string.
 * @internal
 */
export const queryResultValueToString = (val: string) => Buffer.from(val, 'base64').toString('utf8')

