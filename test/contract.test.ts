import path from 'path'
import fs from 'fs'
import { WALLETS } from 'narya'

import { expect, PROXY_ENDPOINT } from './utils'
import { BasicWallet, ProxyProvider, Contract, stringToHex, parseQueryResult, ContractDeploymentTransactionReceipt, ContractQueryResultDataType, numberToHex } from '../dist/cjs'


describe('contracts', () => {
  const adderWasm = fs.readFileSync(path.join(__dirname, 'adder.wasm'))

  const provider = new ProxyProvider(PROXY_ENDPOINT)
  const signer = BasicWallet.fromJsonKeyFileString(JSON.stringify(WALLETS.alice), 'password')
  const sender = signer.address()

  let receipt: ContractDeploymentTransactionReceipt

  beforeAll(async () => {
    receipt = await Contract.deploy(
      adderWasm,
      {},
      [numberToHex(3)],
      {
        provider,
        signer,
        sender,
        gasLimit: 15000000,
      }
    )

    await provider.waitForTransaction(receipt.hash)
  })

  it('can be deployed', async () => {
    const address = await provider.getAddress(receipt.contract.address)
    expect(address.code.length > 0).to.be.true
  })


  it('can be queried', async () => {
    const sum = parseQueryResult(await receipt.contract.query('getSum'), {
      type: ContractQueryResultDataType.INT
    })

    expect(sum).to.equal(3)
  })

  it('can be invoked', async () => {
    const rec = await receipt.contract.invoke('add', [numberToHex(5)], {
      gasLimit: 2000000
    })

    await provider.waitForTransaction(rec.hash)

    const sum2 = parseQueryResult(await receipt.contract.query('getSum'), {
      type: ContractQueryResultDataType.INT
    })

    expect(sum2).to.equal(8)
  })
})
