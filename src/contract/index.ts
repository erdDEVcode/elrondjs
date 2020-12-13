import { Buffer } from 'buffer'

import { 
  ContractQueryResult, 
  ContractQueryResultParseOptions, 
  ContractQueryResultDataType, 
  TransactionOptions,
  Transaction,
  TransactionReceipt,
  Provider,
} from '../common'

import { TransactionOptionsBase, joinDataArguments, TransactionBuilder, verifyTransactionOptions, ADDRESS_ZERO, ARWEN_VIRTUAL_MACHINE, addressToHexString, keccak, hexStringToAddress } from '../lib'


/**
 * @internal
 */
const queryResultValueToHex = (val: string) => `0x${Buffer.from(val, 'base64').toString('hex')}`  

/**
 * @internal
 */
const queryResultValueToString = (val: string) => `0x${Buffer.from(val, 'base64').toString('utf8')}`  


/**
 * Receipt obtained when deploying a contract.
 */
interface ContractDeploymentTransactionReceipt extends TransactionReceipt {
  /**
   * Contract instance for interacting with the deployed contract.
   * 
   * This is only useful if the deployment transaction succeeds.
   */
  contract: Contract,
}

/**
 * Parse a contract query result.
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
        if (!val) {
          return ''
        } else {
          return queryResultValueToString(val)
        }
    default:
      return val
  }
}



/**
 * Builder for contract deployment transactions.
 */
class ContractDeploymentBuilder extends TransactionBuilder {
  protected _code: string
  protected _codeMetadata: string
  protected _initArgs: string[]

  /**
   * Constructor.
   * 
   * @param code Contract bytecode code.
   * @param codeMetadata Contract metadata.
   * @param initArgs Arguments for `init()` method.
   * @param options Transaction options.
   */
  constructor(code: string, codeMetadata: string, initArgs: string[], options?: TransactionOptions) {
    super(options)
    this._code = code
    this._codeMetadata = codeMetadata
    this._initArgs = initArgs
  }

  public getTransactionDataString(): string {
    return joinDataArguments(this._code, ARWEN_VIRTUAL_MACHINE, this._codeMetadata, ...this._initArgs)
  }

  public getReceiverAddress(): string {
    return ADDRESS_ZERO
  }
}



/**
 * Builder for contract invocation transactions.
 */
class ContractInvocationBuilder extends TransactionBuilder {
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
  constructor(address: string, func: string, args: string[], options?: TransactionOptions) {
    super(options)
    this._address = address
    this._func = func
    this._args = args
  }

  public getTransactionDataString(): string {
    return joinDataArguments(this._func, ...this._args)
  }

  public getReceiverAddress(): string {
    return this._address
  }
}

/**
 * Interfaces for working with contracts.
 */
export class Contract extends TransactionOptionsBase {
  protected _address: string = ''

  /**
   * Constructor.
   * 
   * @param address Contract address.
   * @param options Transaction options.
   */
  public constructor(address: string, options?: TransactionOptions) {
    super(options)
    this._address = address
  }

  /**
   * Get instance for contract at given address.
   * 
   * The `options` parameter should typically at least contain `sender`, `provider` and `signer` so that 
   * subsequent interactions can make use of these.
   * 
   * If `options.provider` is set then this checks to ensure that contract code is present at the 
   * given address.
   * 
   * @param address Contract address.
   * @param options Base options for all subsequent transactions and contract querying.
   */
  public static async at(address: string, options?: TransactionOptions): Promise<Contract> {
    // if provider is given then confirm that address contains code!
    if (options?.provider) {
      try {
        const { code } = await options.provider.getAddress(address)
        
        if (!code) {
          throw new Error('No code found at address')
        }
      } catch (err) {
        throw new Error(`Error checking for contract code: ${err.message}`)
      }
    }

    return new Contract(address, options)
  }



  /**
   * Deploy a contract.
   * 
   * The `options` parameter should typically at least contain `sender`, `provider` and `signer` so that 
   * subsequent interactions can make use of these.
   * 
   * @param code Contract bytecode code.
   * @param codeMetadata Contract metadata.
   * @param initArgs Arguments for `init()` method.
   * @param options Base options for all subsequent transactions and contract querying.
   */
  public static async deploy(code: string, codeMetadata: string, initArgs: string[], options: TransactionOptions): Promise<ContractDeploymentTransactionReceipt> {
    verifyTransactionOptions(options!, 'provider', 'signer', 'sender')

    const { provider, sender, signer } = options!

    // compute deployed address
    const computedAddress = await Contract.computeDeployedAddress(sender!, options!.provider!)

    // create deployment transaction
    const obj = Contract.createDeployment(code, codeMetadata, initArgs, options)
    const tx = await obj.toTransaction()

    // sign and send
    const signedTx = await signer!.signTransaction(tx, provider!)
    const txReceipt = await provider!.sendSignedTransaction(signedTx)

    return {
      ...txReceipt,
      contract: new Contract(computedAddress, options)
    }
  }
  

  /**
   * Compute the would-be address of a deployed contract.
   * 
   * The address is computed deterministically, from the address of the deployer and their next transaction nonce.
   * 
   * @param deployer Address of contract deployer/owner in bech32 format.
   * @param provider Provider instance.
   */
  static async computeDeployedAddress(deployer: string, provider: Provider): Promise<string> {
    const { nonce } = await provider.getAddress(deployer)
    return Contract.computeDeployedAddressWithNonce(deployer, nonce)
  }
  
  

  /**
   * Compute the would-be address of a deployed contract.
   * 
   * The address is computed deterministically, from the address of the deployer and the given transaction nonce.
   * 
   * Based on: https://github.com/ElrondNetwork/elrond-sdk/blob/master/erdjs/src/smartcontracts/smartContract.ts#L216
   * 
   * @param deployer Address of contract deployer/owner in bech32 format.
   * @param nonce Their nonce at the time of deployment.
   */
  static async computeDeployedAddressWithNonce (deployer: string, nonce: number): Promise<string> {
    const initialPadding = Buffer.alloc(8, 0)
    const ownerPubkey = Buffer.from(addressToHexString(deployer), 'hex')
    const shardSelector = ownerPubkey.slice(30)
    const ownerNonceBytes = Buffer.alloc(8)
    ownerNonceBytes.writeBigUInt64LE(BigInt(nonce.valueOf()))
    const bytesToHash = Buffer.concat([ownerPubkey, ownerNonceBytes])
    const hash = keccak(bytesToHash)
    const vmTypeBytes = Buffer.from(ARWEN_VIRTUAL_MACHINE, 'hex')
    const addressBytes = Buffer.concat([
      initialPadding,
      vmTypeBytes,
      hash.slice(10, 30),
      shardSelector
    ])
    return hexStringToAddress(addressBytes.toString('hex'))
  }
  
  
  
  /**
   * Create a contract deployment transaction.
   * 
   * The `options` parameter should typically at least contain `sender`, `provider` and `signer` so that 
   * subsequent interactions can make use of these.
   * 
   * @param code Contract bytecode code.
   * @param codeMetadata Contract metadata.
   * @param initArgs Arguments for `init()` method.
   * @param options Transaction options.
   */
  public static createDeployment(code: string, codeMetadata: string, initArgs: string[], options?: TransactionOptions): TransactionBuilder {
    verifyTransactionOptions(options!, 'provider')
    return new ContractInvocationBuilder(code, codeMetadata, initArgs, options)
  }



  /**
   * Query a function in read-only mode, without using a transaction.
   * 
   * This will call the given contract function in read-only mode, i.e. without using a transaction.
   * 
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Options which will get merged with the base options set in the constructor.
   */
  async query(func: string, args?: string[], options?: TransactionOptions): Promise<ContractQueryResult> {
    const mergedOptions = this._mergeTransactionOptions(options, 'provider')

    return await mergedOptions.provider!.queryContract({
      contractAddress: this._address,
      functionName: func,
      args: args || [],
    })
  }

  /**
   * Invoke a function using a transaction.
   * 
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Options which will get merged with the base options set in the constructor.
   */
  async invoke(func: string, args?: string[], options?: TransactionOptions): Promise<TransactionReceipt> {
    const mergedOptions = this._mergeTransactionOptions(options, 'signer', 'provider')

    const obj = this.createInvocation(func, args || [], mergedOptions)
    const tx = await obj.toTransaction()

    const signedTx = await mergedOptions.signer!.signTransaction(tx, mergedOptions.provider!)

    return await mergedOptions.provider!.sendSignedTransaction(signedTx)
  }

  /**
   * Construct a function invocation transaction.
   *
   * @param func Function to call.
   * @param args Arguments to pass to function.
   * @param options Options which will get merged with the base options set in the constructor.
   */
  createInvocation(func: string, args: string[], options?: TransactionOptions): TransactionBuilder {
    return new ContractInvocationBuilder(this._address, func, args, this._mergeTransactionOptions(options, 'provider'))
  }
}
