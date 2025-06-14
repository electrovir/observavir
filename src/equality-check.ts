/**
 * Checks the inputs for equality between each other. Returns `true` if they are equal, otherwise
 * `false`.
 *
 * @category Internal
 */
export type EqualityCheck<T> = (a: T, b: T) => boolean;
