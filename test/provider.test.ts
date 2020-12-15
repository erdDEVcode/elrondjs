import { ProxyProvider } from '../dist/cjs'

const { PROXY_ENDPOINT } = require('./utils')

describe('ProxyProvider', () => {
  test('can get network config', async () => {
    const p = new ProxyProvider(PROXY_ENDPOINT)
    const nc = await p.getNetworkConfig()
    console.log(nc)
    expect(nc.chainId).toEqual('1')
  })
})
