import { TransactionOnChain } from "./common"

/**
 * Error indicating a failed transaction.
 */
export class TransactionFailedError extends Error {
  _txOnChain?: TransactionOnChain

  public constructor(msg: string, txOnChain?: TransactionOnChain) {
    super(msg)
    this._txOnChain = txOnChain
    Error.captureStackTrace(this, TransactionFailedError)
  }

  /**
   * Get on-chain transaction information (if set).
   */
  public get transaction () {
    return this._txOnChain
  }
}
