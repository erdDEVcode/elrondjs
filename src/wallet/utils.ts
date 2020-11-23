/**
 * Definition of the `Elrond.account` type.
 * 
 * Remove this once `@elrondnetwork/elrond-core-js` has type definitions.
 * @internal
 */
export type Account = any


/**
 * @internal
 */
export const validateAccount = (a: any) => {
  a.sign(new TextEncoder().encode('test message'))
}
