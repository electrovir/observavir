import {isNotNoUpdate, type ExcludeNoUpdate} from './no-update.js';

/**
 * The possible types for an async observable's value, each representing a different potential phase
 * in the promise lifecycle.
 *
 * @category AsyncValue
 */
export type AsyncValue<Value> = Error | Promise<ExcludeNoUpdate<Value>> | ExcludeNoUpdate<Value>;

/**
 * Maps an async value to a new async value.
 *
 * @category AsyncValue
 */
export function mapAsyncValue<const OriginalValue, const MappedValue>(
    asyncValue: AsyncValue<OriginalValue>,
    mapper: (value: NoInfer<OriginalValue>) => MappedValue,
): AsyncValue<MappedValue> {
    if (asyncValue instanceof Error) {
        return asyncValue;
    } else if (asyncValue instanceof Promise) {
        return asyncValue.then((value) => {
            const mapped = mapper(value);

            if (isNotNoUpdate(mapped)) {
                return mapped;
            } else {
                throw new Error('Cannot map to no update.');
            }
        });
    } else {
        const mapped = mapper(asyncValue);

        if (isNotNoUpdate(mapped)) {
            return mapped;
        } else {
            throw new Error('Cannot map to no update.');
        }
    }
}

/**
 * If the given async value is resolved, return `true`. Otherwise, `false`. Type guards the input.
 *
 * @category AsyncValue
 */
export function isAsyncValueResolved<const T>(
    asyncValue: AsyncValue<T>,
): asyncValue is ExcludeNoUpdate<T> {
    return !(asyncValue instanceof Promise) && !(asyncValue instanceof Error);
}

/**
 * If the given async value is resolved, its value is returned. Otherwise, `undefined` is returned.
 *
 * @category AsyncValue
 */
export function resolvedAsyncValue<const T>(asyncValue: AsyncValue<T>): T | undefined {
    if (isAsyncValueResolved(asyncValue)) {
        return asyncValue;
    } else {
        return undefined;
    }
}
