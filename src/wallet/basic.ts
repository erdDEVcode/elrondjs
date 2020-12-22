import { Buffer } from 'buffer'
import Elrond from '@elrondnetwork/elrond-core-js'

import { WalletBase } from './base'
import { Account, validateAccount } from './utils'

/**
 * @internal
 */
const PEM_REGEX = /-----BEGIN[^-]+-----([^-]+)-----END[^-]+/igm


/**
 * Generate a random mnemonic.
 */
export const generateMnemonic = (): string => {
  return new Elrond.account().generateMnemonic()
}


/**
 * Basic wallet.
 */
export class BasicWallet extends WalletBase {
  protected _account: Account

  /**
   * Constructor.
   */
  protected constructor(account: Account) {
    super()
    this._account = account
    validateAccount(account)
  }

  /**
   * Generate a wallet using a random mnemonic.
   */
  public static generateRandom(): BasicWallet {
    return BasicWallet.fromMnemonic(generateMnemonic())
  }


  /**
   * Load a wallet using from a mnemonic.
   * 
   * @throws {Error} If loading fails.
   */
  public static fromMnemonic(mnemonic: string): BasicWallet {
    mnemonic = mnemonic.trim()

    try {
      let account = new Elrond.account()
      account.loadFromMnemonic(mnemonic)
      return new BasicWallet(account)
    } catch (err) {
      throw new Error(`Error deriving from mnemonic: ${err.message}`)
    }
  }

  /**
   * Load a wallet from a JSON key file string.
   * 
   * @throws {Error} If loading fails.
   */
  public static fromJsonKeyFileString(json: string, password: string): BasicWallet {
    json = json.trim()

    try {
      let account = new Elrond.account()
      account.loadFromKeyFile(JSON.parse(json), password)
      return new BasicWallet(account)
    } catch (err) {
      throw new Error(`Error deriving from JSON: ${err.message}`)
    }
  }

  /**
   * Load a wallet from a PEM file string.
   * 
   * @throws {Error} If loading fails.
   */
  public static fromPemFileString(pem: string): BasicWallet {
    try {
      const matches = PEM_REGEX.exec(pem.trim())
      const match = (matches ? matches[1] : '').trim()
      if (match) {
        const bytes = Buffer.from(Buffer.from(match, 'base64').toString(), 'hex')
        const uint8array = new Uint8Array(bytes)
        let account = new Elrond.account()
        account.loadFromPrivateKey(uint8array)
        return new BasicWallet(account)
      } else {
        throw new Error('No PEM found')
      }
    } catch (err) {
      throw new Error(`Error deriving from PEM: ${err.message}`)
    }    
  }

  protected async _sign(rawTx: Buffer): Promise<string> {
    return this._account.sign(rawTx)
  }

  protected _getAddress(): string {
    return this._account.address()
  }
}