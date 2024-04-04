/** Return this from any Observable callback to skip assigning the callback's output. */
export const noUpdate = Symbol('no update');

/** Type guards the input as not including `noUpdate`. */
export function isNotNoUpdate<T>(input: T): input is Exclude<T, typeof noUpdate> {
    return input !== noUpdate;
}

/** Remove `noUpdate` as a potential value from the type parameter. */
export type ExcludeNoUpdate<Value> = Exclude<Awaited<Value>, typeof noUpdate>;

/** Add `noUpdate` as a potential value to the type parameter. */
export type IncludeNoUpdate<Value> = Awaited<Value> | typeof noUpdate;
