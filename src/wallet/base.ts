import { Provider, SignedTransaction, Transaction, Wallet } from '../common'

/**
 * Wallet base class.
 */
export abstract class WalletBase implements Wallet {
  public address (): string {
    return this._getAddress()
  }

  public async signTransaction(tx: Transaction, provider: Provider): Promise<SignedTransaction> {
    const address = this.address()

    const { nonce: nonceOnChain } = await provider.getAddress(address)
    const { chainId } = await provider.getNetworkConfig()

    const txData: any = {
      nonce: tx.nonce || nonceOnChain,
      sender: address,
      receiver: tx.receiver,
      value: tx.value.toMinScale().toString(),
      chainID: chainId,
      version: 1,
    }

    if (tx.gasPrice) {
      txData.gasPrice = parseInt(`${tx.gasPrice!}`, 10)
    }

    if (tx.gasLimit) {
      txData.gasLimit = parseInt(`${tx.gasLimit!}`, 10)
    }

    if (tx.data) {
      txData.data = Buffer.from(tx.data).toString('base64')
    }

    console.log(txData)

    const signature = await this._sign(Buffer.from(JSON.stringify(txData)))

    const ret = {
      ...txData,
      signature,
    }

    ret.chainId = ret.chainID
    delete ret.chainID

    return ret
  }

  /**
   * Sign a raw transaction buffer.
   * 
   * @param rawTx The raw transaction.
   */
  protected abstract _sign(rawTx: Buffer | Uint8Array): Promise<string>

  /**
   * Get the bech32 address of this wallet.
   */
  protected abstract _getAddress(): string
}