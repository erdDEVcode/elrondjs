const { ConsoleLogger } = require('typedoc/dist/lib/utils')
const { ProxyProvider, Token, BasicWallet } = require('../')

const ALICE_WALLET = {
  "version": 4,
  "id": "0dc10c02-b59b-4bac-9710-6b2cfa4284ba",
  "address": "0139472eff6886771a982f3083da5d421f24c29181e63888228dc81ca60d69e1",
  "bech32": "erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th",
  "crypto": {
    "ciphertext": "4c41ef6fdfd52c39b1585a875eb3c86d30a315642d0e35bb8205b6372c1882f135441099b11ff76345a6f3a930b5665aaf9f7325a32c8ccd60081c797aa2d538",
    "cipherparams": {
      "iv": "033182afaa1ebaafcde9ccc68a5eac31"
    },
    "cipher": "aes-128-ctr",
    "kdf": "scrypt",
    "kdfparams": {
      "dklen": 32,
      "salt": "4903bd0e7880baa04fc4f886518ac5c672cdc745a6bd13dcec2b6c12e9bffe8d",
      "n": 4096,
      "r": 8,
      "p": 1
    },
    "mac": "5b4a6f14ab74ba7ca23db6847e28447f0e6a7724ba9664cf425df707a84f5a8b"
  }
}

async function init () {
  // const wallet1 = BasicWallet.fromMnemonic(process.env.MNEMONIC)
  const wallet1 = BasicWallet.fromJsonKeyFileString(JSON.stringify(ALICE_WALLET), 'password')
  const wallet2 = BasicWallet.generateRandom()


  const provider = new ProxyProvider('http://localhost:7950')

  const address = wallet1.address()

  const send = async txCall => {
    const tx = await txCall
    return await provider.waitForTransaction(tx.hash)
  }

  await Token.new('RamToken', 'RAM', 100, {
    provider,
    signer: wallet1,
    sender: address,
  })

  const tokenIds = await Token.getAllTokenIds({
    provider,
  })

  console.log(`tokenIds: `, tokenIds)

  // const id = 'RAM-88166b'//tokenIds.pop()

  // console.log(`\nid: ${id}\n`)

  // const t = await Token.load(id, {
  //   provider,
  //   signer: wallet1,
  //   sender: address,
  // })

  // const info = await t.getInfo()
  // console.log(info)

  // // await send(t.updateConfig({
  // //   ...info.config,
  // //   canPause: true,
  // // }))

  // // console.log(await t.getInfo())

  // if (info.paused) {
  //   console.log('Unpausing')

  //   await send(t.unPause())
  // }

  // console.log('Sending to wallet 2')

  // await send(t.transfer(wallet2.address(), 1))

  // console.log(await t.getInfo())
}

init().catch(err => {
  console.error(err)
  process.exit(-1)
})