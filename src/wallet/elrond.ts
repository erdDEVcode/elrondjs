import { Buffer } from 'buffer'
import Elrond from '@elrondnetwork/elrond-core-js'
import { Provider, SignedTransaction, Transaction, Wallet } from '../common'

/**
 * Definition of the `Elrond.account` type.
 * 
 * Remove this once `@elrondnetwork/elrond-core-js` has type definitions.
 * @internal
 */
type Account = any


/**
 * @internal
 */
const PEM_REGEX = /-----BEGIN[^-]+-----([^-]+)-----END[^-]+/igm


/**
 * @internal
 */
const validateAccount = (a: any) => {
  a.sign(new TextEncoder().encode('test message'))
}


/**
 * Generate a random mnemonic.
 */
export const generateMnemonic = (): string => {
  return new Elrond.account().generateMnemonic()
}


/**
 * A [[Provider]] which speaks to an Elrond Proxy endpoint.
 */
export class ElrondWallet implements Wallet {
  protected _account: Account

  /**
   * Constructor.
   */
  protected constructor(account: Account) {
    this._account = account
  }

  /**
   * Generate a wallet using a random mnemonic.
   */
  public static generateRandom(): ElrondWallet {
    return ElrondWallet.fromMnemonic(generateMnemonic())
  }


  /**
   * Load a wallet using from a mnemonic.
   * 
   * @throws {Error} If loading fails.
   */
  public static fromMnemonic(mnemonic: string): ElrondWallet {
    mnemonic = mnemonic.trim()

    try {
      let account = new Elrond.account()
      account.loadFromMnemonic(mnemonic)
      validateAccount(account)
      return new ElrondWallet(account)
    } catch (err) {
      throw new Error(`Error deriving from mnemonic: ${err.message}`)
    }
  }

  /**
   * Load a wallet from a JSON key file string.
   * 
   * @throws {Error} If loading fails.
   */
  public static fromJsonKeyFileString(json: string, password: string): ElrondWallet {
    json = json.trim()

    try {
      let account = new Elrond.account()
      account.loadFromKeyFile(JSON.parse(json), password)
      validateAccount(account)
      return new ElrondWallet(account)
    } catch (err) {
      throw new Error(`Error deriving from JSON: ${err.message}`)
    }
  }

  /**
   * Load a wallet from a PEM file string.
   * 
   * @throws {Error} If loading fails.
   */
  public static fromPemFileString(pem: string): ElrondWallet {
    try {
      const matches = PEM_REGEX.exec(pem.trim())
      const match = (matches ? matches[1] : '').trim()
      if (match) {
        const bytes = Buffer.from(match, 'base64')
        let account = new Elrond.account()
        account.loadFromPrivateKey(bytes)
        validateAccount(account)
        return new ElrondWallet(account)
      } else {
        throw new Error('No PEM found')
      }
    } catch (err) {
      throw new Error(`Error deriving from PEM: ${err.message}`)
    }    
  }

  public address (): string {
    return this._account.address()
  }

  public async signTransaction(tx: Transaction, provider: Provider): Promise<SignedTransaction> {
    const address = this.address()
    const { nonce } = await provider.getAddress(address)
    const { chainId } = await provider.getNetworkConfig()

    const t = new Elrond.transaction(
      nonce,
      address,
      tx.receiver,
      tx.value,
      parseInt(`${tx.gasPrice!}`, 10),
      parseInt(`${tx.gasLimit!}`, 10),
      tx.data,
      chainId,
      1
    )

    const s = t.prepareForSigning()
    t.signature = await this._account.sign(s)

    const st = t.prepareForNode()
    return st        
  }
}