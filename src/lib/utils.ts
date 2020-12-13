import createKeccakHash from 'keccak'

/**
 * Common argument delimiter in elrond.
 */
export const ARGS_DELIMITER = '@'

/**
 * Arwen VM indicator value.
 */
export const ARWEN_VIRTUAL_MACHINE = '0500'


/**
 * Convert ASCII string to its HEX representation.
 * @param arg ASCII string.
 */
export const stringToHex = (arg: string): string => {
  return arg.split('').map(c => ('0' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
}


/**
 * Convert number to its HEX representation.
 * @param arg number.
 */
export const numberToHex = (arg: number): string => {
  return arg.toString(16)
}



/**
 * Get KECCAK hash of given input
 * @param bytes The input.
 */
export const keccak = (bytes: Buffer): Buffer => {
  return createKeccakHash("keccak256").update(bytes).digest()  
}