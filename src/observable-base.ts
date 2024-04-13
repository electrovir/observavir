import {AnyFunction} from '@augment-vir/common';
import {defineShape, isValidShape, unknownShape} from 'object-shape-tester';
import {RemoveListenerCallback} from 'typed-event-target';

/**
 * The base shape for an observable. Useful for determining if any object is an observable without
 * using inheritance checks.
 */
export const observableBaseShape = defineShape({
    /** Listen to value changes. */
    listen(fireImmediately: boolean, callback: AnyFunction): RemoveListenerCallback {
        return () => false;
    },
    /** Free up resources. */
    destroy() {},
    /** Remove a value change listener. */
    removeListener(listener: AnyFunction): boolean {
        return false;
    },
    /** The current value. */
    value: unknownShape(),
});

/** Base observable type. */
export type ObservableBase = typeof observableBaseShape.runTimeType;

/**
 * Checks if the given value matches the expected base observable shape.
 *
 * @category Util
 */
export function isObservableBase(input: unknown): input is ObservableBase {
    return isValidShape(input, observableBaseShape, {allowExtraKeys: true});
}
