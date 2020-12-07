import ElrondLedgerApp from '@elrondnetwork/hw-app-elrond'

import { WalletBase } from "./base"

export const withLedger = async (transport: any, cb: Function) => {
  try {
    const ledgerTransport = await new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Cannot write to Ledger transport'))
      }, 2000)

      let t: any

      try {
        t = await transport.create()
      } catch (err) {
        reject(new Error(`Ledger transport failed: ${err.message}`))
      } finally {
        if (t) {
          clearTimeout(timer)
          resolve(t)
        }
      }
    })

    return await cb(new ElrondLedgerApp(ledgerTransport))
  } catch (err) {
    console.error(err)
    const msg = err.message.toLowerCase()

    const notOpenError =
      msg.includes('cannot write')
      || msg.includes('cannot open')
      || msg.includes('is busy')
      || msg.includes('0x6e')

    const openElsewhereError = 
      msg.includes('unable to reset')
      || msg.includes('unable to claim')

    if (notOpenError) {
      throw new Error('Please ensure that your Ledger is connected and that the Elrond app is open')
    } else if (openElsewhereError) {
      throw new Error('Your ledger is already in use with another browser tab or application')
    } else if (msg.includes('0x6985')) {
      throw new Error('The transaction was rejected on the Ledger')
    } else {
      throw err
    }
  }
}

/**
 * Ledger hardware wallet.
 */
export class LedgerWallet extends WalletBase {
  protected _address: string
  protected _transport: any

  /**
   * Constructor.
   */
  protected constructor(transport: any, address: string) {
    super()
    this._transport = transport
    this._address = address
  }

  /**
   * Connect to the Ledger hardware wallet.
   * 
   * @param ledgerTransports The various Ledger transports to try.
   * @throws {Error} If it fails to connect.
   */
  public static async connect(ledgerTransports: any[]): Promise<LedgerWallet> {
    for (let t of ledgerTransports) {
      const isSupported = await t.isSupported()

      if (isSupported) {
        return await withLedger(t, async (elrondLedgerApp: any) => {
          const { address } = await elrondLedgerApp.getAddress()
          return new LedgerWallet(t, address)
        })
      }
    }

    throw new Error('Ledger transports not supported')
  }

  protected async _sign(rawTx: Buffer): Promise<string> {
    return await withLedger(this._transport, async (erdLedgerInstance: any) => {
      const signedTx: string = await erdLedgerInstance.signTransaction(rawTx)
      return signedTx
    })
  }

  protected _getAddress(): string {
    return this._address
  }
}

