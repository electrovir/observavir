import {
    arePropsStrictEqual,
    getRunTimeType,
    isRunTimeType,
    isStrictEqual,
} from 'run-time-assertions';

/**
 * Custom equality checker that:
 *
 * - Compares properties of objects
 * - Strictly compares primitives
 * - Considers all functions as equal
 */
export function observableEqualityCheck(a: unknown, b: unknown): boolean {
    return arePropsStrictEqual(a, b, propCheckWithFunctionEquality);
}

function propCheckWithFunctionEquality(a: unknown, b: unknown): boolean {
    if (getRunTimeType(a) === getRunTimeType(b) && isRunTimeType(a, 'function')) {
        return true;
    }
    return isStrictEqual(a, b);
}
