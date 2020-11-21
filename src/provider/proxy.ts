import { Api } from '../lib'

import { 
  Provider,
  Address,
  ContractQueryParams,
  ContractQueryResult,
  SignedTransaction,
  TransactionReceipt,
  TransactionOnChain, 
  TransactionStatus,
} from '../common'

/**
 * Parse raw transaction data from the chain.
 * 
 * @param tx Raw transaction data.
 */
export const parseRawTransaction = (tx: any): TransactionOnChain => {
  // status parsing: https://docs.elrond.com/querying-the-blockchain#transaction-status
  let status
  switch (tx.status) {
    case 'success':
    case 'executed':
      status = TransactionStatus.SUCCESS
      break
    case 'fail':
    case 'not-executed':
      status = TransactionStatus.FAILURE
      break
    default:
      status = TransactionStatus.PENDING
  }

  return {
    raw: tx,
    ...tx,
    status,
    timestamp: new Date(tx.timestamp * 1000)
  }
}

/**
 * A [[Provider]] which speaks to an Elrond Proxy endpoint.
 */
export class ProxyProvider extends Api implements Provider {
  /**
   * Constructor.
   * 
   * @param api Proxy endpoint base URL.
   */
  constructor(api: string) {
    super(api)
  }

  /**
   * Parse a reponse.
   * 
   * @param data The returned data to parse.
   * @param errorMsg Prefix for any error messages thrown.
   * @throws {Error} If response indicates a failure or parsing failed.
   */
  protected _parseResponse(data: any, errorMsg: string): any {
    if (data.error || (data.code !== 'successful')) {
      throw new Error(`${errorMsg}: ${data.error || data.code || 'internal error'}`)
    }

    if (undefined === data.data) {
      throw new Error(`${errorMsg}: no data returned`)
    }

    return data.data
  }

  public async getNetworkConfig() {
    const ret = await this._call(`/network/config`)
    const { config } = this._parseResponse(ret, 'Error fetching network config') || {}

    return {
      version: config.erd_latest_tag_software_version,
      chainId: config.erd_chain_id,
      gasPerDataByte: config.erd_gas_per_data_byte,
      minGasPrice: config.erd_min_gas_price,
      minGasLimit: config.erd_min_gas_limit,
      minTransactionVersion: config.erd_min_transaction_version,
    }
  }

  public async getAddress(address: string): Promise<Address> {
    const ret = await this._call(`/address/${address}`)

    const { account } = this._parseResponse(ret, 'Error fetching address info')

    return account
  }

  public async queryContract(params: ContractQueryParams): Promise<ContractQueryResult> {
    const ret = await this._call(`/vm-values/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scAddress: params.contractAddress,
        funcName: params.functionName,
        args: params.args,
      })
    })

    const { data } = this._parseResponse(ret, `Error querying contract`)

    return data
  }

  public async sendSignedTransaction(signedTx: SignedTransaction): Promise<TransactionReceipt> {
    const ret = await this._call(`/transaction/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify(signedTx)
    })

    const { txHash: hash } = this._parseResponse(ret, 'Error sending transaction')

    return { signedTransaction: signedTx, hash }
  }

  public async getTransaction(txHash: string): Promise<TransactionOnChain> {
    const ret = await this._call(`/transaction/${txHash}`, {
      method: 'GET',
    })

    const { transaction: txData } = this._parseResponse(ret, 'Error fetching transaction')

    if (!txData) {
      throw new Error(`Transaction not found`)
    }

    return parseRawTransaction(txData)
  }
}