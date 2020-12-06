import {
  TransactionOptions,
  TokenConfig,
  TokenInfo,
  TransactionReceipt,
} from '../common'


import { stringToHex, numberToHex, addressToHexString } from '../lib'

import { Contract } from '../contract'



/**
 * Metachain contract which handles ESDT token operations.
 * @internal
 */
const METACHAIN_TOKEN_CONTRACT = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u'


/**
 * Gas limit to use for most token operations.
 * @internal
 */
const TOKEN_MGMG_STANDARD_GAS_COST = 51000000



/**
 * Interface for working with ESDT tokens.
 */
export class Token {
  protected _name: string
  protected _ticker: string
  protected _contractInstance: Contract

  /**
   * Constructor.
   * 
   * @param name Token name.
   * @param ticker Ticker name.
   * @param contractInstance `Contract` instance for performing operations.
   */
  private constructor (name: string, ticker: string, contractInstance: Contract) {
    this._name = name
    this._ticker = ticker
    this._contractInstance = contractInstance
  }


  /**
   * Create a new token.
   * 
   * Token name must be between 10 and 20 characters (inclusive) and must only contain alphanumeric characters: `[A-Za-z0-9]`.
   * Ticker name must be between 3 and 10 characters (inclusive) and must only contain capital alphanumeric characters: `[A-Z0-9]`.
   *
   * @param name Human-readable name of token.
   * @param ticker Ticker name of token.
   * @param initialSupply Initial total supply of the token.
   * @param options Transaction options for interacting with the blockchain. These will be the default options used for all subsequent operations.
   */
  public static async createNew(name: string, ticker: string, initialSupply: number, options: TransactionOptions): Promise<Token> {
    const c = new Contract(METACHAIN_TOKEN_CONTRACT, options)
    
    const tx = await c.invoke('issue', [
      stringToHex(name),
      stringToHex(ticker),
      numberToHex(initialSupply)
    ], {
      gasLimit: TOKEN_MGMG_STANDARD_GAS_COST,
      value: '5000000000000000000' /* 5 eGLD */
    })

    await options.provider!.waitForTransaction(tx.hash)

    return new Token(name, ticker, c)
  }


  /**
   * Get token information.
   * 
   * @param options Transaction options to override the default ones with.
   */
  public async getInfo(options?: TransactionOptions): Promise<TokenInfo | null> {
    throw new Error('Not yet implemented!')
  }


  /**
   * Change the total supply of the token.
   * @param newSupply New supply to set.
   * @param options Transaction options to override the default ones with.
   */
  public async mint(newSupply: number, options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('mint', [
      stringToHex(this._name),
      numberToHex(newSupply)
    ], {
      gasLimit: TOKEN_MGMG_STANDARD_GAS_COST,
      ...options
    })
  }

  /**
   * Burn one's own tokens.
   * @param amount Amount to burn.
   * @param options Transaction options to override the default ones with.
   */
  public async burn(amount: number, options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('ESDTburn', [
      stringToHex(this._name),
      numberToHex(amount)
    ], {
      gasLimit: TOKEN_MGMG_STANDARD_GAS_COST,
      ...options
    })
  }


  /**
   * Pause token transfers, but continue to allow burning and minting.
   * @param options Transaction options to override the default ones with.
   */
  public async pause(options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('pause', [
      stringToHex(this._name),
    ], {
      gasLimit: TOKEN_MGMG_STANDARD_GAS_COST,
      ...options
    })
  }


  /**
   * Unpause token transfers.
   * @param options Transaction options to override the default ones with.
   */
  public async unPause(options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('unPause', [
      stringToHex(this._name),
    ], {
      gasLimit: TOKEN_MGMG_STANDARD_GAS_COST,
      ...options
    })
  }

  /**
   * Freeze transfers to/from a specific account.
   * @param address Account address in bech32 format.
   * @param options Transaction options to override the default ones with.
   */
  public async freeze(address: string, options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('freeze', [
      stringToHex(this._name),
      addressToHexString(address),
    ], {
      gasLimit: TOKEN_MGMG_STANDARD_GAS_COST,
      ...options
    })
  }

  /**
   * Unfreeze transfers to/from a specific account.
   * @param address Account address in bech32 format.
   * @param options Transaction options to override the default ones with.
   */
  public async unFreeze(address: string, options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('unFreeze', [
      stringToHex(this._name),
      addressToHexString(address),
    ], {
      gasLimit: TOKEN_MGMG_STANDARD_GAS_COST,
      ...options
    })
  }

  /**
   * Wipe all tokens from a currently frozen account.
   * @param address Account address in bech32 format.
   * @param options Transaction options to override the default ones with.
   */
  public async wipe(address: string, options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('wipe', [
      stringToHex(this._name),
      addressToHexString(address),
    ], {
      gasLimit: TOKEN_MGMG_STANDARD_GAS_COST,
      ...options
    })
  }

  /**
   * Transfer ownership of token to another account.
   * @param newOwner New owner's address in bech32 format.
   * @param options Transaction options to override the default ones with.
   */
  public async changeOwner(newOwner: string, options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('transferOwnership', [
      stringToHex(this._name),
      addressToHexString(newOwner),
    ], {
      gasLimit: TOKEN_MGMG_STANDARD_GAS_COST,
      ...options
    })
  }

  /**
   * Update the token configuration.
   * @param newConfig New token configuration.
   * @param options Transaction options to override the default ones with.
   */
  public async updateConfig(newConfig: TokenConfig, options?: TransactionOptions): Promise<TransactionReceipt> {
    const data = Object.keys(newConfig).reduce((m, v) => {
      m.push(stringToHex(v))
      m.push(stringToHex((newConfig as any)[v] ? 'true' : 'false'))
      return m
    }, [] as string[])

    return await this._contractInstance.invoke('esdtControlChanges', [
      stringToHex(this._name),
      ...data,
    ], {
      gasLimit: TOKEN_MGMG_STANDARD_GAS_COST,
      ...options
    })
  }
}

