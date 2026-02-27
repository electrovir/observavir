import {type Simplify} from 'type-fest';
import {type RemoveListenerCallback} from 'typed-event-target';
import {AnyObservable, type ObservableListener} from './any-observable.js';
import {observableEqualityCheck} from './custom-equality-checker.js';
import {type EqualityCheck} from './equality-check.js';
import {type AllowNoUpdate, type ExcludeNoUpdate} from './no-update.js';

/**
 * Constructor input for {@link Observable}.
 *
 * @category Internal
 */
export type ObservableInit<Value> = {
    /** Starting value */
    defaultValue: ExcludeNoUpdate<Value>;
    /**
     * Callback to use to check equality between the current value and new values from
     * `.setValue()`. If the current value and the new value are equal, the new value will not be
     * set and no listeners will be called. Set this to undefined to disable equality checking,
     * which will then set values and fire listeners for every call of `.setValue()`.
     *
     * @default strict reference equality
     */
    equalityCheck?: EqualityCheck<Simplify<ExcludeNoUpdate<Value>>> | undefined;
};

/**
 * A simple observable with a single value which can be set via `.setValue()` and a listen method.
 * Before a value is set, it is checked for equality with the current value. If they are equal, the
 * value is not set. Equality checking can be turned off by passing `undefined` as the
 * `equalityCheck` constructor parameter or by passing a different equality check callback.
 *
 * @category Observable
 */
export class Observable<Value> extends AnyObservable {
    /**
     * The value currently contained with the observable.
     *
     * Do not set this directly: use `setValue` instead. (If you try to set this value directly, it
     * won't fire listeners which defeats the entire purpose of using an observable.
     */
    public override readonly value: ObservableInit<Value>['defaultValue'];
    /**
     * The function used to check equality between different values. This can be manually set at any
     * time to change the function used.
     */
    public override equalityCheck: ObservableInit<Value>['equalityCheck'];

    constructor(init: ObservableInit<Value>) {
        super();
        this.value = init.defaultValue;
        this.equalityCheck = 'equalityCheck' in init ? init.equalityCheck : observableEqualityCheck;
    }

    /**
     * Set a new value to the observable. The new value will only be set and listeners will only be
     * fired if the new value is not equal to the current value ("equal" determined by the
     * `equalityCheck` constructor parameter) or if equality checking is disabled.
     */
    public override setValue(newValue: AllowNoUpdate<Awaited<Value>>): boolean {
        return super.setValue(newValue);
    }

    /**
     * Listen to changes in the observable's value.
     *
     * @returns A callback to remove the listener.
     */
    public override listen(
        /** If true, the callback will immediately be fired with whatever the current value is. */
        fireImmediately: boolean,
        /** The callback to fire when a new value is set on the observable. */
        callback: ObservableListener<ExcludeNoUpdate<Value>>,
    ): RemoveListenerCallback {
        return super.listen(fireImmediately, callback);
    }

    /**
     * Removes a listener from the observable.
     *
     * @returns `true` if the callback was removed. `false` if the callback was not removed (meaning
     *   it was never added in the first place).
     */
    public override removeListener(callback: ObservableListener<ExcludeNoUpdate<Value>>): boolean {
        return super.removeListener(callback);
    }
}
