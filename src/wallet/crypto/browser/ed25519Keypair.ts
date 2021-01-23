import { derivePath } from 'ed25519-hd-key'
import * as bip39 from 'bip39'
import tweetnacl from 'tweetnacl'

/**
 * @internal
 */
export const HD_PREFIX = "m/44'/508'/0'/0'"


/**
 * @internal
 */
export interface KeyPair {
  privateKey: Uint8Array,
  publicKey: Uint8Array,
}

/**
 * @internal
 */
export const generatePublicKey = (privateKey: Uint8Array): Uint8Array => {
  const kp = tweetnacl.sign.keyPair.fromSecretKey(privateKey)
  return kp.publicKey
}

/**
 * @internal
 */
export const generatePairFromMnemonic = (mnemonic: string): KeyPair => {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("wrong mnemonic format")
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic, '')
  const { key: privateKey } = derivePath(`${HD_PREFIX}/${0}'`, seed as any)

  const arr = Uint8Array.from(privateKey)
  const kp = tweetnacl.sign.keyPair.fromSeed(arr)

  return {
    privateKey: kp.secretKey,
    publicKey: kp.publicKey,
  }
}

/**
 * @internal
 */
export const sign = (message: Uint8Array, privateKey: Uint8Array): Uint8Array => {
  const sig = tweetnacl.sign(message, privateKey)
  // By default, the signature contains the message at the end, we don't need this
  return sig.slice(0, sig.length - message.length)
}
