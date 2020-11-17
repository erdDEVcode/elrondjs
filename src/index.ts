import { base64ToHex } from './utils'
import { Api } from './api'

export { Api, base64ToHex }

/**
 * Network configuration.
 * 
 * These values are obtained by querying an Elrond network.
 */
export interface NetworkConfig {
  /**
   * The version of the Elrond software running on the network.
   */
  version: string,
  /**
   * The unique id of the chain.
   */
  chainId: string,
  /**
   * Gas limit per byte of data sent with a transaction.
   */
  gasPerDataByte: number,
  /**
   * The minimum gas limit of a basic transaction, excluding the gast cost of additional data sent along.
   */
  minGasLimit: number,
  /**
   * The minimum gas price for sending transactions.
   */
  minGasPrice: number,
  /**
   * The minimum value for the transaction version field.
   */
  minTransactionVersion: number,
}

/**
 * An Elrond address.
 * 
 * This may be an externally-owned account or a contract address.
 */
export interface Address {
  /**
   * The bech32 address.
   */
  address: string,
  /**
   * The balance.
   * 
   * Denominated in the smallest unit (10^18 eGLD).
   */
  balance: string,
  /**
   * The last nonce used for sending transactions.
   */
  nonce: number,
  /**
   * The code, if any, at this address.
   */
  code: string,
}

/**
 * Represents the parameters for querying a contract.
 */
export interface ContractQueryParams {
  /**
   * Address of the contract.
   */
  contractAddress: string,
  /**
   * Name of the function to call.
   */
  functionName: string,
  /**
   * Arguments to pass to the function.
   */
  args: string[],
}

/**
 * Represents the result of querying a contract.
 */
export interface ContractQueryResult {
  /**
   * The data returned from the query call.
   */
  returnData: string[],
  /**
   * The result code, indicating success or failure.
   */
  returnCode: string,
  /**
   * Amount of gas which would be refunded had this been a transaction.
   */
  gasRefund: number,
  /**
   * Amount of gas that would be unused had this been a transaction.
   */
  gasRemaining: number,
}

/**
 * Represents the different possible types of a query result.
 */
export enum ContractQueryResultDataType {
  /**
   * Integer data type.
   */
  INT,
  /**
   * Hex string data type.
   */
  HEX,
  /**
   * String data type.
   */
  STRING,
}

/**
 * Represents options for parsing a contract query result.
 */
export interface ContractQueryResultParseOptions {
  /**
   * The desired type to parse the result as.
   */
  type: ContractQueryResultDataType,
  /**
   * The index into the `returnData` array at which th result lies.
   * 
   * @see ContractQueryResult
   */
  index?: number,
}

/**
 * Represents an unsigned transaction.
 */
export interface Transaction {
  /**
   * The sender address in bech32 format.
   */
  sender: string,
  /**
   * The receiver address in bech32 format.
   */
  receiver: string,
  /**
   * The amount of eGLD to transfer.
   * 
   * Denominated in the smallest unit (10^18).
   */
  value: string,
  /**
   * The gas price.
   * 
   * Denominated in the smallest unit (10^18).
   */
  gasPrice?: number,
  /**
   * The gas limit.
   */
  gasLimit?: number,
  /**
   * The data to send in the transaction.
   */
  data?: string,
  /**
   * Options to pass to the transaction signer.
   * 
   * The specific structure of this value will depend on the signer being used.
   */
  meta?: object,
}

/**
 * Represents a signed transaction.
 */
export interface SignedTransaction extends Transaction {
  /**
   * The transaction nonce.
   */
  nonce: number,
  /**
   * The network chain id.
   */
  chainId: string,
  /**
   * Transaction version.
   */
  version: number,
  /**
   * The signature.
   */
  signature: string,
}

/**
 * Represents a transaction receipt returned from the blockchain.
 */
export interface TransactionReceipt {
  /**
   * The final signed transaction.
   */
  signedTransaction: SignedTransaction,
  /**
   * The transaction hash, for tracking purposes.
   */
  hash: string,
}

/**
 * Transaction status.
 */
export enum TransactionStatus {
  /**
   * This means the transaction is yet to be executed by the network.
   */
  PENDING = 0,
  /**
   * This means the transaction was executed by the network and performed all of its actions.
   */
  SUCCESS = 1,
  /**
   * This means the transaction failed to be executed by the network and/or failed to perform all of its actions.
   */
  FAILURE,
}

/**
 * Represents a previously broadcast transction.
 */
export interface TransactionOnChain extends Transaction {
  /**
   * Raw transaction data from the chain.
   */
  raw: object,
  /**
   * Epoch in which transaction was executed.
   */
  epoch: number,
  /**
   * Nonce - account/shard?.
   */
  nonce: number
  /**
   * Epoch round in which transaction was executed.
   */
  round: number,
  /**
   * Gas price.
   * 
   * Denominated in the smallest unit (10^18).
   */
  gasPrice: number,
  /**
   * Gas limit.
   */
  gasLimit: number,
  /**
   * Shard of receiver address.
   */
  destinationShard: number,
  /**
   * Shard of sender address.
   */
  sourceShard: number,
  /**
   * Transaction result status.
   */
  status: TransactionStatus,
  /**
   * Transaction signature.
   */
  signature: string,
  /**
   * Transaction execution time.
   */
  timestamp: Date,
}

/**
 * Interface for interacting with the Elrond network.
 * @see ProxyProvider
 */
export interface Provider {
  /**
   * Get configuration information for the chain.
   */
  getNetworkConfig: () => Promise<NetworkConfig>,
  /**
   * Get on-chain information for given address.
   * 
   * @param address The address.
   */
  getAddress: (address: string) => Promise<Address>,
  /**
   * Query a contract.
   * 
   * This will call the given contract function in read-only mode.
   *
   * @param params Contract query parameters.
   */
  queryContract: (params: ContractQueryParams) => Promise<ContractQueryResult>,
  /**
   * Broadcast a signed transaction to the network.
   *
   * @param signedTx The transaction.
   */
  sendSignedTransaction: (signedTx: SignedTransaction) => Promise<TransactionReceipt>,
  /**
   * Get information about a transaction.
   *
   * @param txHash Hash of transaction to query.
   */
  getTransaction: (txHash: string) => Promise<TransactionOnChain>,
}


/**
 * Interface for signing and sending transactions.
 */
export interface Signer {
  /**
   * Sign a transaction.
   * 
   * @param tx The transaction to sign.
   */
  signTransaction: (tx: Transaction) => Promise<SignedTransaction>,
  /**
   * Sign and broadcast a transaction.
   * 
   * Objects implementing this interface should use a `Provider` to broadcast the 
   * transaction.
   * 
   * @param tx The transaction to sign.
   */
  signAndSendTransaction: (tx: Transaction) => Promise<TransactionReceipt>,
}

/**
 * @internal
 */
const joinArguments = (...args: string[]) => {
  return args.join('@')
}

/**
 * @internal
 */
const queryResultValueToHex = (val: string) => base64ToHex(val)

/**
 * Parse a contracty query result.
 * 
 * @param result The query result.
 * @param options Parsing options.
 */
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
 * Options for interacting with a contract.
 * 
 * This includes default transaction settings as well as the `Provider` to use for contract querying. 
 */
export interface ContractOptions {
  /**
   * Sender bech32 address.
   */
  sender?: string,
  /**
   * Amount to transfer.
   * 
   * Denominated in the smallest eGLD unit (10^18).
   */
  value?: string,
  /**
   * Gas price.
   * 
   * Denominated in the smallest eGLD unit (10^18).
   */
  gasPrice?: number,
  /**
   * Gas limit.
   */
  gasLimit?: number,
  /**
   * Options to pass to the transaction signer.
   *
   * The specific structure of this value will depend on the signer being used.
   */
  meta?: object,
  /**
   * The provider to use.
   */
  provider?: Provider,
  /**
   * The signer to use.
   */
  signer?: Signer,
}

/**
 * Represents a contract-related transaction.
 * 
 * This is the base class of transactions related to deploying, upgrading and calling contracts.
 */
abstract class ContractTransaction {
  protected _options?: ContractOptions

  /**
   * Constructor.
   * 
   * @param options Options for when interacting with a contract. 
   */
  constructor(options?: ContractOptions) {
    this._options = options
  }

  /**
   * Get the `data` string representation of this contract-related transaction.
   */
  public abstract getTransactionDataString(): string
  
  /**
   * Get the transaction representation of this contract-related transaction.
   */
  public abstract async toTransaction(): Promise<Transaction>
}

/**
 * Represents a contract call transaction.
 * 
 * This is for invoking a contract function via a transaction.
 */
class ContractCallTransaction extends ContractTransaction {
  protected _address: string
  protected _func: string
  protected _args: string[]

  /**
   * Constructor.
   * 
   * @param address Contract address.
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Transaction options.
   */
  constructor(address: string, func: string, args: string[], options?: ContractOptions) {
    super(options)
    this._address = address
    this._func = func
    this._args = args
  }

  public getTransactionDataString(): string {
    return joinArguments(this._func, ...this._args)
  }

  public async toTransaction(): Promise<Transaction> {
    if (!this._options) {
      throw new Error('Execution options must be set')
    }

    if (!this._options?.sender) {
      throw new Error('Sender must be set')
    }

    if (!this._options?.provider) {
      throw new Error('Provider must be set')
    }

    const data = this.getTransactionDataString()
    const networkConfig = await this._options?.provider.getNetworkConfig()
    const gasPrice = networkConfig.minGasPrice
    const gasLimit = networkConfig.minGasLimit + networkConfig.gasPerDataByte * data.length

    return {
      sender: this._options!.sender,
      receiver: this._address,
      value: this._options!.value || '0',
      gasPrice: this._options!.gasPrice || gasPrice,
      gasLimit: this._options!.gasLimit || gasLimit,
      data,
      meta: this._options!.meta,
    }
  }
}

/**
 * Interfaces for working with contracts.
 */
export class Contract {
  protected _address: string = ''
  protected _options?: ContractOptions

  /**
   * Get instance for contract at given address.
   * 
   * The `options` parameter should typically at least contain `sender`, `provider` and `signer` so that 
   * subsequent interactions can make use of these.
   * 
   * @param address Contract address.
   * @param options Base options for all subsequent operations.
   */
  public static at(address: string, options?: ContractOptions): Contract {
    const c = new Contract()
    c._address = address
    c._options = options
    return c
  }

  /**
   * Query the contract.
   * 
   * This will call the given contract function in read-only mode, i.e. without using a transaction.
   * 
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Options which will get merged with the base options set in the constructor.
   */
  async query(func: string, args: string[], options?: ContractOptions): Promise<ContractQueryResult> {
    const mergedOptions = this._mergeTransactionOptions(options, 'provider')

    return await mergedOptions.provider!.queryContract({
      contractAddress: this._address,
      functionName: func,
      args,
    })
  }

  /**
   * Call function using a transaction.
   * 
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Options which will get merged with the base options set in the constructor.
   */
  async callFunction(func: string, args: string[], options?: ContractOptions): Promise<TransactionReceipt> {
    const obj = this.createCallTransaction(func, args, options)
    const tx = await obj.toTransaction()
    const mergedOptions = this._mergeTransactionOptions(options, 'signer')

    return await mergedOptions.signer!.signAndSendTransaction(tx)
  }

  /**
   * Get transaction to call a function.
   *
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Options which will get merged with the base options set in the constructor.
   */
  createCallTransaction(func: string, args: string[], options?: ContractOptions): ContractTransaction {
    return new ContractCallTransaction(this._address, func, args, this._mergeTransactionOptions(options, 'provider'))
  }

  /**
   * Merge given options with options set in the constructor.
   * 
   * The options in the constructor will be extended with the given options and a new object will 
   * be returned, leaving the originals unmodified.
   * 
   * @param options Options to merge.
   * @param fieldsToCheck Fields to check the presence of. If any of these fields are missing an error will be thrown.
   * @throws {Errors} If any field listed in `fieldsToCheck` is absent in the final merged options object.
   */
  protected _mergeTransactionOptions(options?: ContractOptions, ...fieldsToCheck: string[]): ContractOptions {
    const mergedOptions = Object.assign({}, this._options, options)

    if (fieldsToCheck.length) {
      fieldsToCheck.forEach(field => {
        if (!(mergedOptions as any)[field]) {
          throw new Error(`${field} must be set`)
        }
      })
    }

    return mergedOptions
  }
}

/**
 * A provider which speaks to an Elrond Proxy endpoint.
 */
export class ProxyProvider extends Api implements Provider {
  /**
   * Constructor.
   * 
   * @param api Proxy endpoint base URL.
   */
  constructor (api: string) {
    super(api)
  }

  /**
   * Parse a reponse.
   * 
   * @param data The returned data to parse.
   * @param errorMsg Prefix for any error messages thrown.
   * @throws {Error} If response indicates a failure or parsing failed.
   */
  protected _parseResponse (data: any, errorMsg: string): any {
    if (data.error || (data.code !== 'successful')) {
      throw new Error(`${errorMsg}: ${data.error || data.code || 'internal error'}`)
    }

    if (undefined === data.data) {
      throw new Error(`${errorMsg}: no data returned`)
    }

    return data.data
  }
    
  public async getNetworkConfig () {
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
  
  public async getAddress (address: string): Promise<Address> {
    const ret = await this._call(`/address/${address}`)

    const { account } = this._parseResponse(ret, 'Error fetching address info')

    return account
  }

  public async queryContract (params: ContractQueryParams): Promise<ContractQueryResult> {
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

