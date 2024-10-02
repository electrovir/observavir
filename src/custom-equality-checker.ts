import {check, checkCustomDeepQuality} from '@augment-vir/assert';

// use checkCustomDeepEquality

/**
 * A custom deep equality checker that:
 *
 * - Strictly compares primitives
 * - Considers all functions as equal
 *
 * @category Internal
 */
export function observableEqualityCheck(a: unknown, b: unknown): boolean {
    return checkCustomDeepQuality(a, b, (c, d) => {
        if (check.isFunction(c) && check.isFunction(d)) {
            return true;
        } else {
            return check.strictEquals(c, d);
        }
    });
}
