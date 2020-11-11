import { Buffer } from 'buffer'

import _ from './lodash'
import { Api } from './api'

export { Api }

export interface NetworkConfig {
  version: string,
  chainId: string,
  gasPerDataByte: number,
  minGasLimit: number,
  minGasPrice: number,
  minTransactionVersion: number,
}

export interface NetworkMetadata {
  primaryToken?: string,
}

export interface Balance {
  token: string,
  amount: string,
}

export interface Rate {
  token: string,
  currency: string,
  value: number,
}

export interface PromiseResolver {
  resolve: Function,
  reject: Function,
}

export interface Address {
  address: string,
  balance: string,
  nonce: number,
  code: string,
  readOnly?: boolean,
}

export interface ContractQueryParams {
  contractAddress: string,
  functionName: string,
  args: string[],
}

export interface ContractQueryResult {
  returnData: string[],
  returnCode: string,
  gasRefund: number,
  gasRemaining: number,
}

export enum ContractQueryResultDataType {
  INT,
  HEX,
  STRING,
}

export interface ContractQueryResultParseOptions {
  type: ContractQueryResultDataType,
  index?: number,
}

export interface Transaction {
  sender: string,
  receiver: string,
  value: string,
  gasPrice?: number,
  gasLimit?: number,
  data?: string,
  meta?: object,
}

export interface SignedTransaction extends Transaction {
  nonce: number,
  chainId: string,
  version: number,
  signature: string,
}

export interface TransactionReceipt {
  signedTransaction: SignedTransaction,
  hash: string,
}

export enum TransactionStatus {
  PENDING = 0,
  SUCCESS = 1,
  FAILURE,
}

export interface TransactionOnChain extends Transaction {
  raw: object,
  epoch: number,
  nonce: number
  round: number,
  gasPrice: number,
  gasLimit: number,
  destinationShard: number,
  sourceShard: number,
  status: TransactionStatus,
  signature: string,
  timestamp: Date,
}

export interface Provider {
  getNetworkConfig: () => Promise<NetworkConfig>,
  getAddress: (address: string) => Promise<Address>,
  queryContract: (params: ContractQueryParams) => Promise<ContractQueryResult>,
  sendSignedTransaction: (signedTx: SignedTransaction) => Promise<TransactionReceipt>,
  getTransaction: (txHash: string) => Promise<TransactionOnChain>,
}

export interface Signer {
  signTransaction: (tx: Transaction) => Promise<SignedTransaction>,
  signAndSendTransaction: (tx: Transaction) => Promise<TransactionReceipt>,
}

export type WalletChangeCallbackHandler = () => void

const joinArguments = (...args: string[]) => {
  return args.join('@')
}

const queryResultValueToHex = (val: string) => {
  return `0x${Buffer.from(val, 'base64').toString('hex')}`  
}

export const parseQueryResult = (result: ContractQueryResult, options: ContractQueryResultParseOptions): (string | number) => {
  options.index = options.index || 0

  const val = result.returnData[options.index]

  switch (options.type) {
    case ContractQueryResultDataType.INT:
      if (!val) {
        return 0
      } else {
        return parseInt(queryResultValueToHex(val), 16) 
      }
    case ContractQueryResultDataType.HEX:
      if (!val) {
        return '0x0'
      } else {
        return queryResultValueToHex(val)
      }
    case ContractQueryResultDataType.STRING:
    default:
      return val
  }
}

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

export interface ContractTransactionOptions {
  sender?: string,
  value?: string,
  gasPrice?: number,
  gasLimit?: number,
  meta?: object,
  provider?: Provider,
  signer?: Signer,
}

abstract class ContractTransaction {
  _transactionOptions?: ContractTransactionOptions

  constructor(options?: ContractTransactionOptions) {
    this._transactionOptions = options
  }

  public abstract getTransactionDataString(): string
  public abstract async toTransaction(): Promise<Transaction>
}

class ContractCallTransaction extends ContractTransaction {
  _address: string
  _func: string
  _args: string[]

  constructor(address: string, func: string, args: string[], options?: ContractTransactionOptions) {
    super(options)
    this._address = address
    this._func = func
    this._args = args
  }

  public getTransactionDataString(): string {
    return joinArguments(this._func, ...this._args)
  }

  public async toTransaction(): Promise<Transaction> {
    if (!this._transactionOptions) {
      throw new Error('Execution options must be set')
    }

    if (!this._transactionOptions?.sender) {
      throw new Error('Sender must be set')
    }

    if (!this._transactionOptions?.provider) {
      throw new Error('Provider must be set')
    }

    const data = this.getTransactionDataString()
    const networkConfig = await this._transactionOptions?.provider.getNetworkConfig()
    const gasPrice = networkConfig.minGasPrice
    const gasLimit = networkConfig.minGasLimit + networkConfig.gasPerDataByte * data.length

    return {
      sender: this._transactionOptions!.sender,
      receiver: this._address,
      value: this._transactionOptions!.value || '0',
      gasPrice: this._transactionOptions!.gasPrice || gasPrice,
      gasLimit: this._transactionOptions!.gasLimit || gasLimit,
      data,
      meta: this._transactionOptions!.meta,
    }
  }
}


export class Contract {
  protected _address: string = ''
  protected _transactionOptions?: ContractTransactionOptions

  static at(address: string, options?: ContractTransactionOptions): Contract {
    const c = new Contract()
    c._address = address
    c._transactionOptions = options
    return c
  }

  async query(func: string, args: string[], options?: ContractTransactionOptions): Promise<ContractQueryResult> {
    const mergedOptions = this._mergeTransactionOptions(options, 'provider')

    return await mergedOptions.provider.queryContract({
      contractAddress: this._address,
      functionName: func,
      args,
    })
  }

  async callFunction(func: string, args: string[], options?: ContractTransactionOptions): Promise<TransactionReceipt> {
    const obj = this.createCallTransaction(func, args, options)
    const tx = await obj.toTransaction()
    const mergedOptions = this._mergeTransactionOptions(options, 'signer')

    return await mergedOptions?.signer.signAndSendTransaction(tx)
  }

  createCallTransaction(func: string, args: string[], options?: ContractTransactionOptions): ContractTransaction {
    return new ContractCallTransaction(this._address, func, args, this._mergeTransactionOptions(options, 'provider'))
  }

  protected _mergeTransactionOptions(options?: ContractTransactionOptions, ...fieldsToCheck: string[]): ContractTransactionOptions {
    const mergedOptions = Object.assign({}, this._transactionOptions, options)

    if (fieldsToCheck.length) {
      fieldsToCheck.forEach(field => {
        if (!mergedOptions[field]) {
          throw new Error(`${field} must be set`)
        }
      })
    }

    return mergedOptions
  }
}

export class ProxyProvider extends Api implements Provider {
  constructor (api: string) {
    super(api)
  }

  protected _parseResponse (data: any, errorMsg: string): any {
    if (data.error || (data.code !== 'successful')) {
      throw new Error(`${errorMsg}: ${data.error || data.code || 'internal error'}`)
    }

    if (undefined === data.data) {
      throw new Error(`${errorMsg}: no data returned`)
    }

    return data.data
  }
    
  async getNetworkConfig () {
    const ret = await this._call(`/network/config`)
    const { config } = this._parseResponse(ret, 'Error fetching network config')

    return {
      version: _.get(config, 'erd_latest_tag_software_version'),
      chainId: _.get(config, 'erd_chain_id'),
      gasPerDataByte: _.get(config, 'erd_gas_per_data_byte'),
      minGasPrice: _.get(config, 'erd_min_gas_price'),
      minGasLimit: _.get(config, 'erd_min_gas_limit'),
      minTransactionVersion: _.get(config, 'erd_min_transaction_version', 1),
    }
  }
  
  async getAddress (address: string): Promise<Address> {
    const ret = await this._call(`/address/${address}`)

    const { account } = this._parseResponse(ret, 'Error fetching address info')

    return account
  }

  async queryContract (params: ContractQueryParams): Promise<ContractQueryResult> {
    const ret = await this._call(`/vm-values/query`, {
      method: 'POST',
      body: JSON.stringify({
        scAddress: params.contractAddress,
        funcName: params.functionName,
        args: params.args,
      })
    })

    const { data } = this._parseResponse(ret, `Error querying contract`)

    return data
  }  

  async sendSignedTransaction(signedTx: SignedTransaction): Promise<TransactionReceipt> {
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

  async getTransaction(txHash: string): Promise<TransactionOnChain> {
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

