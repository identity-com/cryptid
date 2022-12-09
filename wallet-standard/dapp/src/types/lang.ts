/**
 * Copied from [fp-ts](https://gcanti.github.io/fp-ts/modules/NonEmptyArray.ts.html)
 * If we use more constructs from fp-ts we should import it and remove this.
 */
export type NonEmptyArray<A> = Array<A> & {
  0: A;
};
