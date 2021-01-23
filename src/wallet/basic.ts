import { Buffer } from 'buffer'
import * as bip39 from 'bip39'
import bech32 from 'bech32'
import crypto from 'crypto'

import { WalletBase } from './base'
import { KeyPair, generatePairFromMnemonic, sign, generatePublicKey } from './crypto/browser/ed25519Keypair'
import { generateDerivedKey } from './crypto/browser/keyDerivation'

/**
 * @internal
 */
const PEM_REGEX = /-----BEGIN[^-]+-----([^-]+)-----END[^-]+/igm


/**
 * @internal
 */
const MNEMONIC_LEN = 256


/**
 * Generate a random mnemonic.
 */
export const generateMnemonic = (): string => {
  return bip39.generateMnemonic(MNEMONIC_LEN)
}




/**
 * Basic wallet.
 */
export class BasicWallet extends WalletBase {
  protected _keyPair: KeyPair

  /**
   * Constructor.
   */
  protected constructor(keyPair: KeyPair) {
    super()
    this._keyPair = keyPair
    this._sign(Buffer.from('test')) // to check that keypair works
  }

  /**
   * Generate a wallet using a random mnemonic.
   */
  public static generateRandom(): BasicWallet {
    return BasicWallet.fromMnemonic(generateMnemonic())
  }


  /**
   * Load a wallet using from a mnemonic.
   * 
   * @throws {Error} If loading fails.
   */
  public static fromMnemonic(mnemonic: string): BasicWallet {
    mnemonic = mnemonic.trim()

    try {
      const keyPair = generatePairFromMnemonic(mnemonic)
      return new BasicWallet(keyPair)
    } catch (err) {
      throw new Error(`Error deriving from mnemonic: ${err.message}`)
    }
  }

  /**
   * Load a wallet from a JSON key file string.
   * 
   * @throws {Error} If loading fails.
   */
  public static fromJsonKeyFileString(json: string, password: string): BasicWallet {
    try {
      const keyFile = JSON.parse(json.trim())

      const { kdfparams } = keyFile.crypto

      const derivedKey = generateDerivedKey(
        Buffer.from(password),
        Buffer.from(kdfparams.salt, 'hex'), 
        kdfparams.n, 
        kdfparams.r, 
        kdfparams.p, 
        kdfparams.dklen
      )

      const ciphertext = Buffer.from(keyFile.crypto.ciphertext, 'hex')

      const mac = crypto.createHmac('sha256', derivedKey.slice(16, 32))
        .update(ciphertext)
        .digest()

      if (mac.toString('hex') !== keyFile.crypto.mac) {
        throw new Error('MAC mismatch, possibly wrong password')
      }

      const decipher = crypto.createDecipheriv(keyFile.crypto.cipher, derivedKey.slice(0, 16),
        Buffer.from(keyFile.crypto.cipherparams.iv, 'hex'))

      let seed = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      while (seed.length < 32) {
        let nullBuff = Buffer.from([0x00])
        seed = Buffer.concat([nullBuff, seed]);
      }

      const keyPair: KeyPair = {
        privateKey: seed,
        publicKey: generatePublicKey(seed),
      }

      return new BasicWallet(keyPair)
    } catch (err) {
      throw new Error(`Error deriving from JSON: ${err.message}`)
    }
  }

  /**
   * Load a wallet from a PEM file string.
   * 
   * @throws {Error} If loading fails.
   */
  public static fromPemFileString(pem: string): BasicWallet {
    try {
      const matches = PEM_REGEX.exec(pem.trim())
      const match = (matches ? matches[1] : '').trim()
      if (match) {
        const bytes = Buffer.from(Buffer.from(match, 'base64').toString(), 'hex')
        const uint8array = new Uint8Array(bytes)

        const keyPair: KeyPair = {
          privateKey: uint8array,
          publicKey: generatePublicKey(uint8array),
        }

        return new BasicWallet(keyPair)
      } else {
        throw new Error('No PEM found')
      }
    } catch (err) {
      throw new Error(`Error deriving from PEM: ${err.message}`)
    }    
  }

  protected async _sign(rawTx: Buffer | Uint8Array): Promise<string> {
    if (!this._keyPair.privateKey) {
      throw new Error('Key pair corruption, cannot sign message')
    }
    const sig = sign(rawTx, this._keyPair.privateKey)
    return Buffer.from(sig).toString('hex')
  }

  protected _getAddress(): string {
    const words = bech32.toWords(Buffer.from(this._keyPair.publicKey))
    return bech32.encode('erd', words)
  }
}