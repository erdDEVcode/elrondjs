import Transport from '@ledgerhq/hw-transport'
import ElrondLedgerApp from '@elrondnetwork/hw-app-elrond'

import { WalletBase } from "./base"

export const withLedgerAppInstance = async (transport: any, cb: Function) => {
  try {
    const ledgerTransportInstance: Transport = await new Promise(async (resolve, reject) => {
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

    // get the result and then close the transport
    let ret
    let error
    try {
      ret = await cb(new ElrondLedgerApp(ledgerTransportInstance), ledgerTransportInstance)
    } catch (err) {
      error = err
    }

    await ledgerTransportInstance.close()
    
    if (ret) { 
      return ret 
    }

    if (error) {
      throw error
    }
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
  protected _activeTransportInstances: Record<string,Transport>

  /**
   * Constructor.
   */
  protected constructor(transport: any, address: string) {
    super()
    this._transport = transport
    this._address = address
    this._activeTransportInstances = {}
  }

  /**
   * Get whether there are pending actions on the Ledger.
   * 
   * If there are pending actions then Ledger transport instances cannot be closed until the user either 
   * accepts or rejects those actions on the Ledger. 
   */
  public hasPendingActions(): Boolean {
    return Object.values(this._activeTransportInstances).length > 0
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
        return await withLedgerAppInstance(t, async (elrondLedgerApp: any) => {
          const { address } = await elrondLedgerApp.getAddress()
          return new LedgerWallet(t, address)
        })
      }
    }

    throw new Error('Ledger transports not supported')
  }

  protected async _withLedger(cb: Function): Promise<any> {
    return await withLedgerAppInstance(this._transport, async (erdLedgerInstance: any, ledgerTransportInstance: Transport) => {
      // keep track of this open transport instance, and clean it up later below once we're done with it
      const instanceId = Math.random().toString()
      this._activeTransportInstances[instanceId] = ledgerTransportInstance

      try {
        let ret = await cb(erdLedgerInstance)
        delete this._activeTransportInstances[instanceId]
        return ret
      } catch (err) {
        delete this._activeTransportInstances[instanceId]
        throw err
      }
    })
  }

  protected async _sign(rawTx: Buffer): Promise<string> {
    return await this._withLedger(async (erdLedgerInstance: any) => {
      const { contractData } = await erdLedgerInstance.getAppConfiguration()

      if ('1' != contractData) {
        throw new Error('Please enable "Contract Data" in the Elrond ledger app settings.')
      }

      const signedTx: string = await erdLedgerInstance.signTransaction(rawTx)

      return signedTx
    })
  }

  protected _getAddress(): string {
    return this._address
  }
}

