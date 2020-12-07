import { Provider, Transaction, TransactionOnChain, TransactionOptions, TransactionStatus } from "../common"
import { ARGS_DELIMITER } from "./utils"


/**
 * Transaction tracker.
 * 
 * This is used by the `ProxyProvider.waitForTransaction()` method.
 */
export class TransactionTracker {
  _txHash: string
  _provider: Provider

  /**
   * Constructor.
   * @param provider The provider to check with.
   * @param txHash The transaction hash.
   */
  constructor (provider: Provider, txHash: string) {
    this._provider = provider
    this._txHash = txHash
  }

  /**
   * Wait until this transaction has finished executing.
   * 
   * @throws {Error} If transaction fails or transaction tracking fails for whatever reason.
   */
  async waitForCompletion(): Promise<TransactionOnChain> {
    return new Promise((resolve, reject) => {
      const _wait = () => {
        setTimeout(() => {
          this._provider.getTransaction(this._txHash)
            .then(txOnChain => {
              switch (txOnChain.status) {
                case TransactionStatus.FAILURE:
                  reject(
                    new Error(`Transaction failed: ${this._txHash}`)
                  )
                  break
                case TransactionStatus.SUCCESS:
                  resolve(txOnChain)
                  break
                default:
                  _wait()
              }
            })
            .catch(err => {
              reject(
                new Error(`Error checking transaction ${this._txHash}: ${err.message}`)
              )
            })
        }, 5000 /* check every 5 seconds */)
      }
      // start the loop
      _wait()
    })
  }
}



/**
 * Base class for all implementations which make use of `TransactionOptions` whereby options are first 
 * provided in the constructor and can then be overridden on a per-call basis.
 * @internal
 */
export abstract class TransactionOptionsBase {
  protected _options?: TransactionOptions

  /**
   * Constructor.
   * @param options Base transaction options.
   */
  constructor (options?: TransactionOptions) {
    this._options = options
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
  protected _mergeTransactionOptions(options?: TransactionOptions, ...fieldsToCheck: string[]): TransactionOptions {
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




/**
 * Generic transaction builder base class.
 */
export abstract class TransactionBuilder {
  protected _options?: TransactionOptions

  /**
   * Constructor.
   * 
   * @param options Transaction options.
   */
  constructor(options?: TransactionOptions) {
    this._options = options
  }

  /**
   * Get the `data` string representation of this transaction.
   */
  public abstract getTransactionDataString(): string

  /**
   * Get `receiver` address.
   */
  public abstract getReceiverAddress(): string

  /**
   * Get signable transaction representation of this transaction.
   */

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
    const networkConfig = await this._options!.provider.getNetworkConfig()
    const gasPrice = networkConfig.minGasPrice
    const gasLimit = networkConfig.minGasLimit + networkConfig.gasPerDataByte * data.length

    return {
      sender: this._options!.sender,
      receiver: this.getReceiverAddress(),
      value: this._options!.value || '0',
      gasPrice: this._options!.gasPrice || gasPrice,
      gasLimit: this._options!.gasLimit || gasLimit,
      data,
      meta: this._options!.meta,
    }
  }
}



/**
 * Join arguments for transaction data field.
 * @internal
 */
export const joinDataArguments = (...args: string[]) => {
  return args.join(ARGS_DELIMITER)
}



