import {
  TransactionOptions,
  TokenConfig,
  TokenInfo,
  TransactionReceipt,
  ContractQueryResultDataType,
  Transaction,
} from '../common'


import { stringToHex, numberToHex, addressToHexString, ARGS_DELIMITER, joinDataArguments, TransactionOptionsBase, TransactionBuilder } from '../lib'

import { Contract, parseQueryResult } from '../contract'



/**
 * Address of metachain contract which handles ESDT token issuance and all other operations.
 */
const METACHAIN_TOKEN_CONTRACT = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u'


/**
 * Gas limit to use for most token management operations.
 * @internal
 */
const TOKEN_MGMT_STANDARD_GAS_COST = 51000000



/**
 * Builder for token transfer transactions.
 */
class TokenTransferBuilder extends TransactionBuilder {
  protected _receiver: string
  protected _tokenId: string
  protected _amount: number


  /**
   * Constructor.
   * 
   * @param receiver Address to transfer to.
   * @param tokenId Id of token.
   * @param amount No. of tokens to transfer.
   * @param options Transaction options.
   */
  constructor(receiver: string, tokenId: string, amount: number, options?: TransactionOptions) {
    super(options)
    this._receiver = receiver
    this._tokenId = tokenId
    this._amount = amount
  }

  public getTransactionDataString(): string {
    return joinDataArguments(`ESDTTransfer`, stringToHex(this._tokenId), numberToHex(this._amount))
  }

  public getReceiverAddress(): string {
    return this._receiver
  }
}



/**
 * Interface for working with ESDT tokens.
 */
export class Token extends TransactionOptionsBase {
  protected _id: string
  protected _contractInstance: Contract

  /**
   * Constructor.
   * 
   * @param id Token identifier.
   * @param contractInstance `Contract` instance for performing operations.
   * @param options Base transaction options.
   */
  private constructor (id: string, contractInstance: Contract, options?: TransactionOptions) {
    super(options)
    this._id = id
    this._contractInstance = contractInstance
  }


  /**
   * Get all token identifiers in system.
   * @param options Transaction options for interacting with the blockchain. These will be the default options used for all subsequent operations.
   */
  public static async getAllTokenIds(options: TransactionOptions): Promise<string[]> {
    const c = new Contract(METACHAIN_TOKEN_CONTRACT, options)

    const ret = await c.query('getAllESDTTokens')

    const tokenListStr = (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING }) as string)

    return tokenListStr.split(ARGS_DELIMITER)
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
  public static async new(name: string, ticker: string, initialSupply: number, options: TransactionOptions): Promise<Token> {
    const c = new Contract(METACHAIN_TOKEN_CONTRACT, options)
    
    const tx = await c.invoke('issue', [
      stringToHex(name),
      stringToHex(ticker),
      numberToHex(initialSupply)
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
      value: '5000000000000000000' /* 5 eGLD */
    })

    await options.provider!.waitForTransaction(tx.hash)

    const id = 'foo' // TODO: need to obtain token id from transaction results and then 

    return Token.load(id, options)
  }



  /**
   * Load a token.
   * 
   * This will throw an error if the given token doesn't exist.
   * 
   * @param id Token identifier.
   * @param options Transaction options for interacting with the blockchain. These will be the default options used for all subsequent operations.
   */
  public static async load(id: string, options: TransactionOptions): Promise<Token> {
    const c = new Contract(METACHAIN_TOKEN_CONTRACT, options)

    const t = new Token(id, c, options)

    await t.getInfo()
    
    return t
  }
  
  

  /**
   * Get token information.
   * 
   * @param options Transaction options to override the default ones with.
   */
  public async getInfo(options?: TransactionOptions): Promise<TokenInfo> {
    const ret = await this._contractInstance.query('getTokenProperties', [ 
      stringToHex(this._id)
    ], options)

    return {
      id: this._id,
      name: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 0 }) as string),
      owner: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 1 }) as string),
      supply: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 2 }) as string),
      paused: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 4 }) as string).includes('true'),
      config: {
        canUpgrade: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 5 }) as string).includes('true'),
        canMint: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 6 }) as string).includes('true'),
        canBurn: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 7 }) as string).includes('true'),
        canChangeOwner: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 8 }) as string).includes('true'),
        canPause: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 9 }) as string).includes('true'),
        canFreeze: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 10 }) as string).includes('true'),
        canWipe: (parseQueryResult(ret, { type: ContractQueryResultDataType.STRING, index: 11 }) as string).includes('true'),
      }
    }
  }


  /**
   * Transfer tokens to another address.
   * 
   * @param to Address to transfer to.
   * @param amount No. of tokens to transfer.
   * @param options Transaction options to override the default ones with.
   */
  public async transfer(to: string, amount: number, options?: TransactionOptions): Promise<TransactionReceipt> {
    const opts = this._mergeTransactionOptions(options, 'sender', 'provider', 'signer')

    const builder = new TokenTransferBuilder(to, this._id, amount, opts)

    const tx = await builder.toTransaction()

    const signedTx = await opts.signer!.signTransaction(tx, opts.provider!)
    
    return await opts.provider!.sendSignedTransaction(signedTx)
  }


  /**
   * Change the total supply of the token.
   * @param newSupply New supply to set.
   * @param options Transaction options to override the default ones with.
   */
  public async mint(newSupply: number, options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('mint', [
      stringToHex(this._id),
      numberToHex(newSupply)
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
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
      stringToHex(this._id),
      numberToHex(amount)
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
      ...options
    })
  }


  /**
   * Pause token transfers, but continue to allow burning and minting.
   * @param options Transaction options to override the default ones with.
   */
  public async pause(options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('pause', [
      stringToHex(this._id),
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
      ...options
    })
  }


  /**
   * Unpause token transfers.
   * @param options Transaction options to override the default ones with.
   */
  public async unPause(options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('unPause', [
      stringToHex(this._id),
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
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
      stringToHex(this._id),
      addressToHexString(address),
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
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
      stringToHex(this._id),
      addressToHexString(address),
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
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
      stringToHex(this._id),
      addressToHexString(address),
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
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
      stringToHex(this._id),
      addressToHexString(newOwner),
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
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

    return await this._contractInstance.invoke('controlChanges', [
      stringToHex(this._id),
      ...data,
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
      ...options
    })
  }
}

