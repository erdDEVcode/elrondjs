/**
 * Common argument delimiter in elrond.
 */
export const ARGS_DELIMITER = '@'


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


