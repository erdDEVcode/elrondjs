import { TransactionReceipt } from "./common"

/**
 * Error indicating a failed transaction.
 */
export class TransactionFailedError extends Error {
  _receipt?: TransactionReceipt

  public constructor(msg: string, receipt?: TransactionReceipt) {
    super(msg)
    this._receipt = receipt
    Error.captureStackTrace(this, TransactionFailedError)
  }

  /**
   * Get transaction receipt (if set).
   */
  public get receipt () {
    return this._receipt
  }
}
