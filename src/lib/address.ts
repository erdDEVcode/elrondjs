import Elrond from '@elrondnetwork/elrond-core-js'

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
 * The NULL address.
 */
export const ADDRESS_ZERO = '0'.repeat(64)
