import { ContractQueryResultDataType, TransactionOptions, } from '../common'
import { stringToHex, TransactionOptionsBase, NUM_SHARDS } from '../lib'
import { Contract, parseQueryResult } from '../contract'



interface DnsConfig {
  /**
   * A mapping of shard numbers to DNS contract addresses.
   * 
   * If ommitted then default built-in mappings will be used.
   */
  shardContracts: string[],
}


/**
 * Default DNS configuration.
 * @internal
 */
const DEFAULT_CONFIG = {
  // Default Mainnet DNS contracts
  shardContracts: [
    // shard 0
    'erd1qqqqqqqqqqqqqpgqe2cmllq3zhwfuzdpdzqh7223xnc907ffqphs865ruf',
    'erd1qqqqqqqqqqqqqpgq776u6lt7u5dr6ekn0636t3ua845gfppgqq4q4gewzt',
    // shard 1
    'erd1qqqqqqqqqqqqqpgq3uxwmwtgmms6jytn3vzlw89vrxxe9xjwqrmsjex283',
    // shard 2
    'erd1qqqqqqqqqqqqqpgqhmfvs04uzqrjajvslgsypfjhtyyaz7esqqjspwx8zh',
    'erd1qqqqqqqqqqqqqpgqmta7xtt292599mray67za5c3rl2yc5h0qq5sfya89w',
  ]
}



/**
 * Interface for working with Elrond DNS.
 */
export class Dns extends TransactionOptionsBase {
  _config: DnsConfig

  /**
   * Constructor.
   * 
   * @param config DNS configuration.
   * @param options Base transaction options.
   */
  public constructor(transactionOptions?: TransactionOptions, dnsConfig?: DnsConfig) {
    super(transactionOptions)
    this._config = dnsConfig || DEFAULT_CONFIG
  }

  /**
   * Resolve given DNS name.
   * 
   * @param name Name to resolve, in the form `XXX.elrond`.
   * @param options Overrides for options passed in via the constructor.
   * 
   * @return Empty string if name is not registered.
   */
  public async resolve (name: string, options?: TransactionOptions): Promise<string> {
    const mergedOptions = this._mergeTransactionOptions(options)

    for (let contractAddr of this._config.shardContracts) {
      const c = await Contract.at(contractAddr, mergedOptions)
      const ret = await c.query('resolve', [stringToHex(name)])
      if (ret.returnData.length) {
        return parseQueryResult(ret, { type: ContractQueryResultDataType.ADDRESS }) as string
      }
    }

    return ''
  }
}

