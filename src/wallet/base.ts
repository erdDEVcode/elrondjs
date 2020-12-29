import Elrond from '@elrondnetwork/elrond-core-js'
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

    const t = new Elrond.transaction(
      tx.nonce || nonceOnChain,
      address,
      tx.receiver,
      tx.value,
      parseInt(`${tx.gasPrice!}`, 10),
      parseInt(`${tx.gasLimit!}`, 10),
      tx.data,
      chainId,
      1
    )

    const s = t.prepareForSigning()
    t.signature = await this._sign(s)

    const st = t.prepareForNode()
    return st        
  }

  /**
   * Sign a raw transaction buffer.
   * 
   * @param rawTx The raw transaction.
   */
  protected abstract _sign(rawTx: Buffer): Promise<string>

  /**
   * Get the bech32 address of this wallet.
   */
  protected abstract _getAddress(): string
}