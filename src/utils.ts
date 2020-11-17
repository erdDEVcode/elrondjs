const Global = ((): any => {
  if (typeof self !== 'undefined') { return self }
  if (typeof window !== 'undefined') { return window }
  if (typeof global !== 'undefined') { return global }
  throw new Error('unable to locate global object')
})()

/**
 * Convert Base64 string to its Hex representation.
 * 
 * @param str Base64 input string.
 * @returns {string} hex string prefixed with `0x`.
 * @throws {Error} if unable to convert.
 */
export const base64ToHex = (str: string) => {
  if (typeof Global.Buffer !== 'undefined') {
    return `0x${Global.Buffer.from(str, 'base64').toString('hex')}`  
  } else if (typeof Global.atob !== 'undefined') {
    return `0x${[...atob(str)].map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))}`
  } else {
    throw new Error('Unable to convert base64 to hex')
  }
}


