import { BigVal } from "bigval"
import { Provider, Transaction, TransactionOnChain, TransactionOptions, TransactionReceipt, TransactionStatus } from "../common"
import { TransactionFailedError } from "../errors"
import { ARGS_DELIMITER, stringToHex } from "./utils"





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
   * @throws {TransactionFailedError} If transaction fails or transaction tracking fails for whatever reason.
   */
  async waitForCompletion(): Promise<TransactionReceipt> {
    const receipt: TransactionReceipt = {
      hash: this._txHash
    }

    return new Promise((resolve, reject) => {
      const _wait = () => {
        setTimeout(() => {
          this._provider.getTransaction(this._txHash)
            .then(txOnChain => {
              receipt.transactionOnChain = txOnChain

              switch (txOnChain.status) {
                case TransactionStatus.FAILURE:
                  let errMsg = `Transaction failed: ${receipt.hash}`
                  if (txOnChain.smartContractErrors.length) {
                    errMsg = `Smart contract error:\n\n${txOnChain.smartContractErrors.join("\n")}`
                  } 
                  reject(new TransactionFailedError(errMsg, receipt))
                  break
                case TransactionStatus.SUCCESS:
                  resolve(receipt)
                  break
                default:
                  _wait()
              }
            })
            .catch(err => {
              reject(
                new TransactionFailedError(`Error checking transaction ${this._txHash}: ${err.message}`)
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
    verifyTransactionOptions(mergedOptions, ...fieldsToCheck)
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

    const tx = await setDefaultGasPriceAndLimit({
      sender: this._options!.sender,
      receiver: this.getReceiverAddress(),
      value: this._options!.value || new BigVal(0),
      data: this.getTransactionDataString(),
      meta: this._options!.meta,
    }, this._options!.provider)

    tx.gasPrice = this._options!.gasPrice || tx.gasPrice
    tx.gasLimit = this._options!.gasLimit || tx.gasLimit

    return tx
  }
}


/**
 * Get a copy of given transaction with default gas price and limit set.
 * 
 * @param tx The transaction.
 * @param provider The provider.
 */
export const setDefaultGasPriceAndLimit = async (tx: Transaction, provider: Provider): Promise<Transaction> => {
  const networkConfig = await provider.getNetworkConfig()
  const gasPrice = networkConfig.minGasPrice
  const gasLimit = networkConfig.minGasLimit + networkConfig.gasPerDataByte * (tx.data || '').length

  return {
    ...tx,
    gasPrice,
    gasLimit,
  }
}



/**
 * Verify that given transaction options contain certain fields specified.
 * 
 * @param options Transaction options.
 * @param fieldsToCheck The fields to check for.
 * @throws {Error} if transaction options are empty or any required fields are missing.
 */
export const verifyTransactionOptions = (options?: TransactionOptions, ...fieldsToCheck: string[]) => {
  if (!options) {
    throw new Error('Transaction options are empty')
  }

  if (fieldsToCheck.length) {
    fieldsToCheck.forEach(field => {
      if (!(options as any)[field]) {
        throw new Error(`${field} must be set`)
      }
    })
  }
}



/**
 * Generate transaction data arguments from given key-value map.
 * @param keyValueMap The key-value map.
 */
export const convertMapToDataArguments = (keyValueMap: object): string[] => {
  return Object.keys(keyValueMap).reduce((m, v) => {
    m.push(stringToHex(v))
    m.push(stringToHex((keyValueMap as any)[v] ? 'true' : 'false'))
    return m
  }, [] as string[])
}



/**
 * Join arguments for transaction data field.
 * @internal
 */
export const joinDataArguments = (...args: string[]) => {
  return args.join(ARGS_DELIMITER)
}



