import {check} from '@augment-vir/assert';
import {type AnyFunction} from '@augment-vir/common';
import {checkValidShape, defineShape} from 'object-shape-tester';
import {type RemoveListenerCallback} from 'typed-event-target';

/**
 * Marks an object as an observavir observable. {@link isObservableBase} requires it so that objects
 * which merely have `listen`, `removeListener`, and `destroy` methods (like typed-event-target
 * listen targets) are not treated as observables.
 *
 * @category Internal
 */
export const observableMarker = Symbol.for('observavir-observable');

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
});

/**
 * Base observable type.
 *
 * @category Internal
 */
export type ObservableBase = typeof observableBaseShape.runtimeType & {
    readonly [observableMarker]: true;
};

/**
 * Checks if the given value is marked with {@link observableMarker} and matches the expected base
 * observable shape.
 *
 * @category Internal
 */
export function isObservableBase(input: unknown): input is ObservableBase {
    return (
        check.isObject(input) &&
        observableMarker in input &&
        input[observableMarker] === true &&
        checkValidShape(input, observableBaseShape)
    );
}
