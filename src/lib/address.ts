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

