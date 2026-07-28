import {type AnyFunction} from '@augment-vir/common';
import {checkValidShape, defineShape, unknownShape} from 'object-shape-tester';
import {type RemoveListenerCallback} from 'typed-event-target';

/**
 * The base shape for an observable. Useful for determining if any object is an observable without
 * using inheritance checks.
 *
 * @category Internal
 */
export const observableBaseShape = defineShape({
    /** Listen to value changes. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    listen(fireImmediately: boolean, callback: AnyFunction): RemoveListenerCallback {
        return () => false;
    },
    /** Free up resources. */
    destroy() {},
    /** Remove a value change listener. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removeListener(listener: AnyFunction): boolean {
        return false;
    },
    /** The current value. */
    value: unknownShape(),
});

/**
 * Base observable type.
 *
 * @category Internal
 */
export type ObservableBase = typeof observableBaseShape.runtimeType;

/**
 * Checks if the given value matches the expected base observable shape.
 *
 * @category Internal
 */
export function isObservableBase(input: unknown): input is ObservableBase {
    return checkValidShape(input, observableBaseShape);
}
