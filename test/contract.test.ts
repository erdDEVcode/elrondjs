import path from 'path'
import fs from 'fs'
import { WALLETS } from 'narya'

import { expect, PROXY_ENDPOINT } from './utils'
import { BasicWallet, ProxyProvider, Contract, parseQueryResult, ContractDeploymentTransactionReceipt, ContractQueryResultDataType, numberToHex, Token, ContractQueryResult } from '../src'
import delay from 'delay'
import { BigVal } from 'bigval'



describe('contracts', () => {
  const adderWasm = fs.readFileSync(path.join(__dirname, 'adder.wasm'))

  const provider = new ProxyProvider(PROXY_ENDPOINT)
  const signer = BasicWallet.fromJsonKeyFileString(JSON.stringify(WALLETS.alice), 'password')
  const sender = signer.address()

  let receipt: ContractDeploymentTransactionReceipt

  beforeEach(async () => {
    receipt = await Contract.deploy(
      adderWasm,
      {
      },
      [numberToHex(3)],
      {
        provider,
        signer,
        sender,
        gasLimit: 15000000,
      }
    )
  })

  it('can be deployed', async () => {
    const address = await provider.getAddress(receipt.contract.address)
    expect(address.code.length > 0).to.be.true
  })


  it('can be queried', async () => {
    const sum = parseQueryResult(await receipt.contract.query('getSum'), {
      type: ContractQueryResultDataType.INT
    })

    expect(sum).to.eq(3)
  })

  it('can be invoked', async () => {
    await receipt.contract.invoke('add', [numberToHex(5)], {
      gasLimit: 2000000
    })

    const sum2 = parseQueryResult(await receipt.contract.query('getSum'), {
      type: ContractQueryResultDataType.INT
    })

    expect(sum2).to.eq(8)
  })

  it('can be invoked with tokens', async () => {
    const token = await Token.new(
      'RamToken',
      'RAM',
      new BigVal(10000),
      18,
      {
        canBurn: false,
        canChangeOwner: false,
        canFreeze: false,
        canMint: false,
        canPause: false,
        canUpgrade: false,
        canWipe: false,
      },
      {
        provider,
        signer,
        sender,
      }
    )

    await delay(15000)
    await token.balanceOf(sender).should.eventually.eq('10000')

    await receipt.contract.invoke('add', [numberToHex(5)], {
      gasLimit: 2500000,
      esdt: {
        id: token.id,
        value: new BigVal(1),
      }
    })

    const sum2 = parseQueryResult(await receipt.contract.query('getSum'), {
      type: ContractQueryResultDataType.INT
    })

    expect(sum2).to.eq(8)

    // check contract token balance
    await token.balanceOf(receipt.contract.address).should.eventually.eq('1')
  })

  it('can be found', async () => {
    const c = await Contract.at(receipt.contract.address, {
      provider,
      signer,
      sender,
    })

    const sum = parseQueryResult(await receipt.contract.query('getSum'), {
      type: ContractQueryResultDataType.INT
    })

    expect(sum).to.eq(3)
  })

  describe('and upgrades', () => {
    it('are off by default', async () => {
      await receipt.contract.upgrade(adderWasm, {}, [ 
        numberToHex(3) 
      ], {
        gasLimit: 15000000
      }).should.be.rejected
    })

    it('are on if deployed as upgradeable', async () => {
      const { contract } = await Contract.deploy(
        adderWasm,
        {
          upgradeable: true,
        },
        [numberToHex(3)],
        {
          provider,
          signer,
          sender,
          gasLimit: 15000000,
        }
      )

      await contract.upgrade(adderWasm, {
        upgradeable: true,
      }, [
        numberToHex(3)
      ], {
        gasLimit: 15000000
      })
    })
  })
})



describe('query response parser', () => {
  const baseResult: ContractQueryResult = {
    gasRefund: 0,
    gasRemaining: 0,
    returnCode: 'ok',
    returnData: [],
  }

  it('can parse a string', async () => {
    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        'aGVsbG8gd29ybGQ='
      ]
    }, {
      type: ContractQueryResultDataType.STRING
    })).to.eq('hello world')
  })

  it('can parse at a certain index', async () => {
    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        '',
        'aGVsbG8gd29ybGQ='
      ]
    }, {
      type: ContractQueryResultDataType.STRING,
      index: 1,
    })).to.eq('hello world')
  })

  it('can parse hex', async () => {
    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        '',
      ]
    }, {
      type: ContractQueryResultDataType.HEX,
    })).to.eq('0x0')

    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        'aGVsbG8gd29ybGQ=',
      ]
    }, {
      type: ContractQueryResultDataType.HEX,
    })).to.eq('68656c6c6f20776f726c64')
  })

  it('can parse an address', async () => {
    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        'aGVsbG8gd29ybGQ=',
      ]
    }, {
      type: ContractQueryResultDataType.ADDRESS,
    })).to.eq('erd1dpjkcmr0ypmk7unvvswtvfkv')
  })

  it('can parse an int', async () => {
    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        '',
      ]
    }, {
      type: ContractQueryResultDataType.INT,
    })).to.eq(0)

    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        'RjI=',
      ]
    }, {
      type: ContractQueryResultDataType.INT,
    })).to.eq(17970)
  })

  it('can parse a big int', async () => {
    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        '',
      ]
    }, {
      type: ContractQueryResultDataType.BIG_INT,
    }).toString()).to.eq('0')

    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        'RkZGRjM0NQ==',
      ]
    }, {
      type: ContractQueryResultDataType.BIG_INT,
    }).toString()).to.eq('19780516009161781')
  })

  it('can parse a boolean', async () => {
    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        '',
      ]
    }, {
      type: ContractQueryResultDataType.BOOLEAN,
    })).to.eq(false)

    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        'dHJ1ZQ==',
      ]
    }, {
      type: ContractQueryResultDataType.BOOLEAN,
    })).to.eq(true)

    expect(parseQueryResult({
      ...baseResult,
      returnData: [
        'ZmFsc2U=',
      ]
    }, {
      type: ContractQueryResultDataType.BOOLEAN,
    })).to.eq(false)
  })

})