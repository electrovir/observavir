import {isStrictEqual} from 'run-time-assertions';
import {Simplify} from 'type-fest';
import {RemoveListenerCallback} from 'typed-event-target';
import {AnyObservable, ObservableListener} from './any-observable';
import {EqualityCheck} from './equality-check';
import {noUpdate} from './no-update';

/** Constructor input for the observable class. */
export type ObservableInit<Value> = {
    /** Starting value */
    defaultValue: Value;
    /**
     * Callback to use to check equality between the current value and new values from
     * `.setValue()`. If the current value and the new value are equal, the new value will not be
     * set and no listeners will be called. Set this to undefined to disable equality checking,
     * which will then set values and fire listeners for every call of `.setValue()`.
     *
     * @default strict reference equality
     */
    equalityCheck?: EqualityCheck<Simplify<Value>> | undefined;
};

/**
 * A simple observable with a single value which can be set via `.setValue()` and a listen method.
 * Before a value is set, it is checked for equality with the current value. If they are equal, the
 * value is not set. Equality checking can be turned off by passing `undefined` as the
 * `equalityCheck` constructor parameter or by passing a different equality check callback.
 *
 * @category Main
 */
export class Observable<Value> extends AnyObservable {
    /**
     * The value currently contained with the observable.
     *
     * Do not set this directly: use `setValue` instead. (If you try to set this value directly, it
     * won't fire listeners which defeats the entire purpose of using an observable.
     */
    public override readonly value: Value;
    /**
     * The function used to check equality between different values. This can be manually set at any
     * time to change the function used.
     */
    public override equalityCheck: EqualityCheck<Simplify<Value>> | undefined;

    constructor(init: ObservableInit<Value>) {
        super();
        this.value = init.defaultValue;
        this.equalityCheck = init.equalityCheck || isStrictEqual;
    }

    /**
     * Set a new value to the observable. The new value will only be set and listeners will only be
     * fired if the new value is not equal to the current value ("equal" determined by the
     * `equalityCheck` constructor parameter) or if equality checking is disabled.
     */
    public override setValue(newValue: Value | typeof noUpdate): boolean {
        return super.setValue(newValue);
    }

    /**
     * Listen to changes in the observable's value.
     *
     * @returns A callback to remove the listener.
     */
    public override listen(
        /** The callback to fire when a new value is set on the observable. */
        callback: ObservableListener<Value>,
    ): RemoveListenerCallback {
        return super.listen(callback);
    }

    /**
     * Removes a listener from the observable.
     *
     * @returns `true` if the callback was removed. `false` if the callback was not removed (meaning
     *   it was never added in the first place).
     */
    public override removeListener(callback: ObservableListener<Value>): boolean {
        return super.removeListener(callback);
    }
}
