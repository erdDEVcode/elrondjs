export * from './base'
export * from './basic'
export * from './ledger'

import { WalletBase } from './base'
import { BasicWallet } from './basic'

/**
 * Serialize given wallet instance.
 * 
 * @param w Wallet instance.
 */
export const serializeWallet = (w: WalletBase): string => {
  return w.serialize()
}


/**
 * Deserialize given wallet data.
 * 
 * @param data Previously serialized wallet data
 */
export const deserializeWallet = (data: string): (WalletBase | null) => {
  try {
    if (BasicWallet.canDeserialize(data)) {
      return BasicWallet.fromSerialized(data)
    }
  } catch (err) {
    console.warn(err)
  }

  return null
}

