import { Buffer } from 'buffer'

import { 
  ContractQueryResult, 
  ContractQueryResultParseOptions, 
  ContractQueryResultDataType, 
  ContractOptions,
  Transaction,
  TransactionReceipt,
} from '../common'


/**
 * @internal
 */
const joinArguments = (...args: string[]) => {
  return args.join('@')
}

/**
 * @internal
 */
const queryResultValueToHex = (val: string) => `0x${Buffer.from(val, 'base64').toString('hex')}`  

/**
 * Parse a contracty query result.
 * 
 * @param result The query result.
 * @param options Parsing options.
 */
export const parseQueryResult = (result: ContractQueryResult, options: ContractQueryResultParseOptions): (string | number) => {
  options.index = options.index || 0

  const val = result.returnData[options.index]

  switch (options.type) {
    case ContractQueryResultDataType.INT:
      if (!val) {
        return 0
      } else {
        return parseInt(queryResultValueToHex(val), 16)
      }
    case ContractQueryResultDataType.HEX:
      if (!val) {
        return '0x0'
      } else {
        return queryResultValueToHex(val)
      }
    case ContractQueryResultDataType.STRING:
    default:
      return val
  }
}



/**
 * Represents a contract-related transaction.
 * 
 * This is the base class of transactions related to deploying, upgrading and calling contracts.
 */
abstract class ContractTransaction {
  protected _options?: ContractOptions

  /**
   * Constructor.
   * 
   * @param options Options for when interacting with a contract. 
   */
  constructor(options?: ContractOptions) {
    this._options = options
  }

  /**
   * Get the `data` string representation of this contract-related transaction.
   */
  public abstract getTransactionDataString(): string

  /**
   * Get signable transaction representation of this contract-related transaction.
   */
  public abstract async toTransaction(): Promise<Transaction>
}


/**
 * Represents a transaction to call a contract function.
 */
class ContractInvocation extends ContractTransaction {
  protected _address: string
  protected _func: string
  protected _args: string[]


  /**
   * Constructor.
   * 
   * @param address Contract address.
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Transaction options.
   */
  constructor(address: string, func: string, args: string[], options?: ContractOptions) {
    super(options)
    this._address = address
    this._func = func
    this._args = args
  }

  public getTransactionDataString(): string {
    return joinArguments(this._func, ...this._args)
  }

  public async toTransaction(): Promise<Transaction> {
    if (!this._options) {
      throw new Error('Execution options must be set')
    }

    if (!this._options?.sender) {
      throw new Error('Sender must be set')
    }

    if (!this._options?.provider) {
      throw new Error('Provider must be set')
    }

    const data = this.getTransactionDataString()
    const networkConfig = await this._options?.provider.getNetworkConfig()
    const gasPrice = networkConfig.minGasPrice
    const gasLimit = networkConfig.minGasLimit + networkConfig.gasPerDataByte * data.length

    return {
      sender: this._options!.sender,
      receiver: this._address,
      value: this._options!.value || '0',
      gasPrice: this._options!.gasPrice || gasPrice,
      gasLimit: this._options!.gasLimit || gasLimit,
      data,
      meta: this._options!.meta,
    }
  }
}

/**
 * Interfaces for working with contracts.
 */
export class Contract {
  protected _address: string = ''
  protected _options?: ContractOptions

  /**
   * Get instance for contract at given address.
   * 
   * The `options` parameter should typically at least contain `sender`, `provider` and `signer` so that 
   * subsequent interactions can make use of these.
   * 
   * @param address Contract address.
   * @param options Base options for all subsequent operations.
   */
  public static async at(address: string, options?: ContractOptions): Promise<Contract> {
    const c = new Contract()
    c._address = address
    c._options = options

    // if provider is given then confirm that address contains code!
    if (options?.provider) {
      try {
        const { code } = await options.provider.getAddress(address)
        
        if (!code) {
          throw new Error('No code found at address')
        }
      } catch (err) {
        throw new Error(`Error checking for contract code: ${err.message}`)
      }
    }

    return c
  }

  /**
   * Query a function in read-only mode, without using a transaction.
   * 
   * This will call the given contract function in read-only mode, i.e. without using a transaction.
   * 
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Options which will get merged with the base options set in the constructor.
   */
  async query(func: string, args?: string[], options?: ContractOptions): Promise<ContractQueryResult> {
    const mergedOptions = this._mergeTransactionOptions(options, 'provider')

    return await mergedOptions.provider!.queryContract({
      contractAddress: this._address,
      functionName: func,
      args: args || [],
    })
  }

  /**
   * Invoke a function using a transaction.
   * 
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Options which will get merged with the base options set in the constructor.
   */
  async invoke(func: string, args?: string[], options?: ContractOptions): Promise<TransactionReceipt> {
    const mergedOptions = this._mergeTransactionOptions(options, 'signer', 'provider')

    const obj = this.createInvocation(func, args || [], mergedOptions)
    const tx = await obj.toTransaction()

    const signedTx = await mergedOptions.signer!.signTransaction(tx, mergedOptions.provider!)

    return await mergedOptions.provider!.sendSignedTransaction(signedTx)
  }

  /**
   * Construct a function invocation transaction.
   *
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Options which will get merged with the base options set in the constructor.
   */
  createInvocation(func: string, args: string[], options?: ContractOptions): ContractTransaction {
    return new ContractInvocation(this._address, func, args, this._mergeTransactionOptions(options, 'provider'))
  }

  /**
   * Merge given options with options set in the constructor.
   * 
   * The options in the constructor will be extended with the given options and a new object will 
   * be returned, leaving the originals unmodified.
   * 
   * @param options Options to merge.
   * @param fieldsToCheck Fields to check the presence of. If any of these fields are missing an error will be thrown.
   * @throws {Errors} If any field listed in `fieldsToCheck` is absent in the final merged options object.
   */
  protected _mergeTransactionOptions(options?: ContractOptions, ...fieldsToCheck: string[]): ContractOptions {
    const mergedOptions = Object.assign({}, this._options, options)

    if (fieldsToCheck.length) {
      fieldsToCheck.forEach(field => {
        if (!(mergedOptions as any)[field]) {
          throw new Error(`${field} must be set`)
        }
      })
    }

    return mergedOptions
  }
}
