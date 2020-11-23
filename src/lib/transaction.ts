import { Provider, TransactionStatus } from "../common"


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
  async waitForCompletion (): Promise<void> {
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
                  resolve()
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