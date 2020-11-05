export interface NetworkConfig {
  version: string,
  chainId: string,
  gasPerDataByte: number,
  minGasLimit: number,
  minGasPrice: number,
  minTransactionVersion: number,
}

export interface Account {
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

export type ContractQueryResult = {
  returnData: string[],
  returnCode: string,
  gasRefund: number,
  gasRemaining: number,
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
  getAccount: (address: string) => Promise<Account>,
  queryContract: (params: ContractQueryParams) => Promise<ContractQueryResult>,
  sendSignedTransaction: (signedTx: SignedTransaction) => Promise<TransactionReceipt>,
  signAndSendTransaction: (tx: Transaction) => Promise<TransactionReceipt>,
  getTransaction: (txHash: string) => Promise<TransactionOnChain>,
}

export interface ContractQueryOptions {
  provider?: Provider,
}

export interface ExecutionOptions {
  sender?: string,
  value?: string,
  gasPrice?: number,
  gasLimit?: number,
  provider?: Provider,
  meta?: object,
}

const joinArguments = (...args: string[]) => {
  return args.join('@')
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

abstract class ContractTransaction {
  executionOptions?: ExecutionOptions

  constructor(_options?: ExecutionOptions) {
    this.executionOptions = _options
  }

  public abstract getTransactionDataString(): string
  public abstract async toTransaction(): Promise<Transaction>
}

class ContractCallTransaction extends ContractTransaction {
  address: string
  func: string
  args: string[]

  constructor(_address: string, _func: string, _args: string[], _options?: ExecutionOptions) {
    super(_options)
    this.address = _address
    this.func = _func
    this.args = _args
  }

  public getTransactionDataString(): string {
    return joinArguments(this.func, ...this.args)
  }

  public async toTransaction(): Promise<Transaction> {
    if (!this.executionOptions) {
      throw new Error('Execution options must be set')
    }

    if (!this.executionOptions?.sender) {
      throw new Error('Sender must be set')
    }

    if (!this.executionOptions?.provider) {
      throw new Error('Provider must be set')
    }

    const data = this.getTransactionDataString()
    const networkConfig = await this.executionOptions?.provider.getNetworkConfig()
    const gasPrice = networkConfig.minGasPrice
    const gasLimit = networkConfig.minGasLimit + networkConfig.gasPerDataByte * data.length

    return {
      sender: this.executionOptions!.sender,
      receiver: this.address,
      value: this.executionOptions!.value || '0',
      gasPrice: this.executionOptions!.gasPrice || gasPrice,
      gasLimit: this.executionOptions!.gasLimit || gasLimit,
      data,
      meta: this.executionOptions!.meta,
    }
  }
}

export class Contract {
  address: string = ''
  executionOptions?: ExecutionOptions

  static async at(address: string, options?: ExecutionOptions): Promise<Contract> {
    const c = new Contract()
    c.address = address
    c.executionOptions = options
    return c
  }

  query(_func: string, _args: string[], options: ContractQueryOptions): any {
    // TODO
  }

  async callFunction(_func: string, _args: string[], options?: ExecutionOptions): Promise<TransactionReceipt> {
    const obj = this.createCallTransaction(_func, _args, options)
    const tx = await obj.toTransaction()
    const mergedOptions = this._mergeChainOptions(options)

    if (!mergedOptions?.provider) {
      throw new Error('A provider must be set')
    }

    return await mergedOptions?.provider.signAndSendTransaction(tx)
  }

  createCallTransaction(func: string, args: string[], options?: ExecutionOptions): ContractTransaction {
    return new ContractCallTransaction(this.address, func, args, this._mergeChainOptions(options))
  }

  private _mergeChainOptions(options?: ExecutionOptions) {
    return Object.assign({}, this.executionOptions, options)
  }
}