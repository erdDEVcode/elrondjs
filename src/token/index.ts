import { BigVal, BigValScale } from 'bigval'

import {
  TransactionOptions,
  TokenConfig,
  TokenInfo,
  TransactionReceipt,
  ContractQueryResultDataType,
  ContractQueryResult,
  ContractQueryResultParseOptions,
} from '../common'


import { stringToHex, numberToHex, addressToHexString, ARGS_DELIMITER, joinDataArguments, TransactionOptionsBase, TransactionBuilder, convertMapToDataArguments, hexStringToAddress, queryResultValueToHex } from '../lib'
import { Contract, parseQueryResult } from '../contract'


/**
 * Parse token info result.
 * 
 * Wrapper around `parseQueryResult()` which performs additional processing.
 * 
 * @param result The query result.
 * @param options Parsing options.
 * 
 * @internal
 */
export const parseTokenInfo = (result: ContractQueryResult, options: ContractQueryResultParseOptions, regex: RegExp): (string | number | BigVal | boolean) => {
  const inputVal: string = parseQueryResult(result, {
    ...options,
    type: ContractQueryResultDataType.STRING,
  }) as string

  const parsed = regex.exec(inputVal)
  const parsedVal = parsed ? parsed![1] : ''

  switch (options.type) {
    case ContractQueryResultDataType.BOOLEAN: {
      if (!parsedVal) {
        return false
      } else {
        return parsedVal.includes('true')
      }
    }
    case ContractQueryResultDataType.BIG_INT:
    case ContractQueryResultDataType.INT: {
      let ret: BigVal

      if (!parsedVal) {
        ret = new BigVal(0)
      } else {
        ret = new BigVal(parsedVal)
      }

      return (options.type === ContractQueryResultDataType.INT ? ret.toNumber() : ret)
    }
    case ContractQueryResultDataType.ADDRESS: {
      return hexStringToAddress(queryResultValueToHex(inputVal))
    }
    case ContractQueryResultDataType.HEX: {
      if (!parsedVal) {
        return '0x0'
      } else {
        return queryResultValueToHex(inputVal)
      }
    }
    case ContractQueryResultDataType.STRING:
    default: {
      return parsedVal
    }
  }
}


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
 * Token creation cost.
 * @internal
 */
const TOKEN_CREATION_COST = new BigVal(5, BigValScale.NORMAL, { decimals: 18 })


/**
 * Builder for token transfer transactions.
 */
class TokenTransferBuilder extends TransactionBuilder {
  protected _receiver: string
  protected _tokenId: string
  protected _amount: BigVal


  /**
   * Constructor.
   * 
   * @param receiver Address to transfer to.
   * @param tokenId Id of token.
   * @param amount No. of tokens to transfer.
   * @param options Transaction options.
   */
  constructor(receiver: string, tokenId: string, amount: BigVal, options?: TransactionOptions) {
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
   * Get token id.
   */
  public get id () {
    return this._id
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
   * @param initialSupply Initial total supply of the token, taking into account the no. of decimal places. Denominated in base-10.
   * @param numDecimals No. of decimals token balances have. The recommended value is 18.
   * @param initialConfig Initial token configuration.
   * @param options Transaction options for interacting with the blockchain. These will be the default options used for all subsequent operations.
   */
  public static async new(name: string, ticker: string, initialSupply: BigVal, numDecimals: number = 18, initialConfig: TokenConfig, options: TransactionOptions): Promise<Token> {
    const c = new Contract(METACHAIN_TOKEN_CONTRACT, options)

    const tx = await c.invoke('issue', [
      stringToHex(name),
      stringToHex(ticker),
      numberToHex(initialSupply),
      numberToHex(numDecimals),
      ...convertMapToDataArguments(initialConfig)
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
      value: TOKEN_CREATION_COST /* 5 eGLD */
    })

    await options.provider!.waitForTransaction(tx.hash)

    // find out token id
    const possibleIds = (await Token.getAllTokenIds(options)).reverse().filter(id => id.includes(`${ticker}-`))

    for (let id of possibleIds) {
      const t = new Token(id, c, options)
      try {
        const info = await t.getInfo()
        if (info.name === name && info.supply.eq(initialSupply) && info.owner === options.sender) {
          return t
        }
      } catch (err) {
        console.log(err)
        /* if id invalid then skip */
      }
    }

    throw new Error(`Token created, but unable to retrieve token id`)
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
      ticker: this._id.substr(0, this._id.indexOf('-')),
      owner: (parseQueryResult(ret, { type: ContractQueryResultDataType.ADDRESS, index: 1 }) as string),
      supply: (parseTokenInfo(ret, { type: ContractQueryResultDataType.BIG_INT, index: 2 }, /(.+)/) as BigVal),
      decimals: (parseTokenInfo(ret, { type: ContractQueryResultDataType.INT, index: 4 }, /NumDecimals\-(.+)/) as number),
      paused: (parseTokenInfo(ret, { type: ContractQueryResultDataType.BOOLEAN, index: 5 }, /IsPaused\-(.+)/) as boolean),
      config: {
        canUpgrade: (parseTokenInfo(ret, { type: ContractQueryResultDataType.BOOLEAN, index: 6 }, /CanUpgrade\-(.+)/) as boolean),
        canMint: (parseTokenInfo(ret, { type: ContractQueryResultDataType.BOOLEAN, index: 7 }, /CanMint\-(.+)/) as boolean),
        canBurn: (parseTokenInfo(ret, { type: ContractQueryResultDataType.BOOLEAN, index: 8 }, /CanBurn\-(.+)/) as boolean),
        canChangeOwner: (parseTokenInfo(ret, { type: ContractQueryResultDataType.BOOLEAN, index: 9 }, /CanChangeOwner\-(.+)/) as boolean),
        canPause: (parseTokenInfo(ret, { type: ContractQueryResultDataType.BOOLEAN, index: 10 }, /CanPause\-(.+)/) as boolean),
        canFreeze: (parseTokenInfo(ret, { type: ContractQueryResultDataType.BOOLEAN, index: 11 }, /CanFreeze\-(.+)/) as boolean),
        canWipe: (parseTokenInfo(ret, { type: ContractQueryResultDataType.BOOLEAN, index: 12 }, /CanWipe\-(.+)/) as boolean),
      }
    }
  }


  /**
   * Get balance of given address.
   * 
   * @param address Address in bech-32 format.
   * @param options Transaction options to override the default ones with.
   */
  public async balanceOf(address: string, options?: TransactionOptions): Promise<BigVal> {
    const opts = await this._mergeTransactionOptions(options, 'provider')

    const { balance } = await opts.provider!.getESDTData(address, this.id)

    return balance
  }



  /**
   * Transfer tokens to another address.
   * 
   * @param to Address to transfer to.
   * @param amount No. of tokens to transfer.
   * @param options Transaction options to override the default ones with.
   */
  public async transfer(to: string, amount: BigVal, options?: TransactionOptions): Promise<TransactionReceipt> {
    const opts = this._mergeTransactionOptions({
      gasLimit: 500000,
      ...options
    }, 'sender', 'provider', 'signer')

    const builder = new TokenTransferBuilder(to, this._id, amount, opts)

    const tx = await builder.toTransaction()

    const signedTx = await opts.signer!.signTransaction(tx, opts.provider!)
    const hash = await opts.provider!.sendSignedTransaction(signedTx)
    return opts.provider!.waitForTransaction(hash)
  }


  /**
   * Mint more tokens.
   * 
   * @param amount Amount to mint.
   * @param address Address to mint to. If ommitted tokens will be minted to the current config owner.
   * @param options Transaction options to override the default ones with.
   */
  public async mint(amount: string, address?: string, options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('mint', [
      stringToHex(this._id),
      numberToHex(amount),
      ...(address ? [ addressToHexString(address) ] : [])
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
  public async burn(amount: string, options?: TransactionOptions): Promise<TransactionReceipt> {
    return await this._contractInstance.invoke('ESDTBurn', [
      stringToHex(this._id),
      numberToHex(amount)
    ], {
      gasLimit: 2500000,
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
    const data = convertMapToDataArguments(newConfig)

    return await this._contractInstance.invoke('controlChanges', [
      stringToHex(this._id),
      ...data,
    ], {
      gasLimit: TOKEN_MGMT_STANDARD_GAS_COST,
      ...options
    })
  }
}

