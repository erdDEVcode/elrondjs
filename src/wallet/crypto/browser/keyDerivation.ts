import { Buffer } from 'buffer'
import scryptsy from 'scryptsy'

export const generateDerivedKey = (key: Buffer, salt: Buffer | string = '', nrOfIterations = 4096, memFactor = 8, pFactor = 1, dkLen = 32): Buffer => {
  return scryptsy(key, salt, nrOfIterations, memFactor, pFactor, dkLen)
}

