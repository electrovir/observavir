/**
 * Return this from any Observable callback to skip assigning the callback's output as the new
 * observable value.
 *
 * @category Observable
 */
export const noUpdate = Symbol('no update');

/**
 * Type guards the input as not including {@link noUpdate}.
 *
 * @category Internal
 */
export function isNotNoUpdate<T>(input: T): input is ExcludeNoUpdate<T> {
    return input !== noUpdate;
}

/**
 * Remove {@link noUpdate} from the given union.
 *
 * @category Internal
 */
export type ExcludeNoUpdate<Value> = Exclude<Awaited<Value>, typeof noUpdate>;

/**
 * Union {@link noUpdate} with the given type.
 *
 * @category Internal
 */
export type AllowNoUpdate<Value> = Value | typeof noUpdate;
