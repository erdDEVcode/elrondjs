const { ConsoleLogger } = require('typedoc/dist/lib/utils')
const { ProxyProvider, Token, BasicWallet } = require('../')

async function init () {
  const wallet1 = BasicWallet.fromMnemonic(process.env.MNEMONIC)
  const wallet2 = BasicWallet.generateRandom()

  const provider = new ProxyProvider('https://testnet-gateway.elrond.com')

  const address = wallet1.address()

  const send = async txCall => {
    const tx = await txCall
    await provider.waitForTransaction(tx.hash)
  }

  // const tokenIds = await Token.getAllTokenIds({
  //   provider,
  // })

  // console.log(`tokenIds: `, tokenIds)

  const id = 'RAM-88166b'//tokenIds.pop()

  console.log(`\nid: ${id}\n`)

  const t = await Token.load(id, {
    provider,
    signer: wallet1,
    sender: address,
  })

  const info = await t.getInfo()
  console.log(info)

  // await send(t.updateConfig({
  //   ...info.config,
  //   canPause: true,
  // }))

  // console.log(await t.getInfo())

  if (info.paused) {
    console.log('Unpausing')

    await send(t.unPause())
  }

  console.log('Sending to wallet 2')

  await send(t.transfer(wallet2.address(), 1))

  console.log(await t.getInfo())
}

init().catch(err => {
  console.error(err)
  process.exit(-1)
})