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
  readOnly?: boolean,
}

export enum ContractValueType {
  STRING = 'string',
  INT = 'int',
  HEX = 'hex',
  QUERY = 'query',
}

export interface GetContractValueParams {
  contractAddress: string,
  functionName: string,
  args: [string],
  valueType: ContractValueType,
}

export type GetContractValueResult = string | [string]

export interface Transaction {
  sender: string,
  receiver: string,
  value: string,
  gasPrice?: number,
  gasLimit?: number,
  data?: string,
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
  SUCCESS = 1,
  FAILURE,
}

export interface TransactionOnChain extends Transaction {
  raw: object,
  gasUsed: number,
  id: string,
  miniBlockHash: string,
  nonce: number
  receiverShard: number,
  round: number,
  senderShard: number,
  status: TransactionStatus,
  timestamp: Date,
}

export interface Provider {
  getNetworkConfig: () => Promise<NetworkConfig>,
  getAccount: (address: string) => Promise<Account>,
  getCode: (address: string) => Promise<string>,
  getContractValue: (params: GetContractValueParams) => Promise<GetContractValueResult>,
  estimateGasLimit: (tx: Transaction) => Promise<number>,
  signAndSendTransaction: (tx: Transaction) => Promise<TransactionReceipt>,
  sendSignedTransaction: (signedTx: SignedTransaction) => Promise<TransactionReceipt>,
  getTransaction: (txHash: string) => Promise<TransactionOnChain>,
}

export interface ContractQueryOptions {
  provider?: Provider,
}

export interface ContractExecutionOptions {
  sender: string,
  value?: string,
  gasPrice?: number,
  gasLimit?: number,
  provider?: Provider,
}

const joinArguments = (...args: string[]) => {
  return args.join('@')
}

abstract class ContractTransaction {
  executionOptions?: ContractExecutionOptions

  constructor(_options?: ContractExecutionOptions) {
    this.executionOptions = _options
  }

  public abstract getTransactionDataString(): string
  public abstract async toTransaction(): Promise<Transaction>
}

class CallFunctionTransaction extends ContractTransaction {
  address: string
  func: string
  args: string[]

  constructor(_address: string, _func: string, _args: string[], _options?: ContractExecutionOptions) {
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

    // TODO: calculate gas limit from network

    return {
      sender: this.executionOptions!.sender,
      receiver: this.address,
      value: this.executionOptions!.value || '0',
      gasPrice: this.executionOptions!.gasPrice,
      gasLimit: this.executionOptions!.gasLimit,
      data: this.getTransactionDataString()
    }
  }
}

export class Contract {
  address: string = ''
  executionOptions?: ContractExecutionOptions

  static at(address: string, options?: ContractExecutionOptions): Contract {
    const c = new Contract()
    c.address = address
    c.executionOptions = options
    return c
  }

  query(_func: string, _args: string[], options: ContractQueryOptions): any {
    // TODO
  }

  async callFunction(_func: string, _args: string[], options?: ContractExecutionOptions): Promise<TransactionReceipt> {
    const obj = this.createCallFunctionTransaction(_func, _args, options)
    const tx = await obj.toTransaction()

    if (!options?.provider) {
      throw new Error('No provider')
    }

    return await options?.provider.signAndSendTransaction(tx)
  }

  createCallFunctionTransaction(func: string, args: string[], options?: ContractExecutionOptions): ContractTransaction {
    return new CallFunctionTransaction(this.address, func, args, this._mergeChainOptions(options))
  }

  private _mergeChainOptions(options?: ContractExecutionOptions) {
    return Object.assign({}, this.executionOptions, options)
  }
}