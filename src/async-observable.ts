import {
    MaybePromise,
    createDeferredPromiseWrapper,
    ensureError,
    randomString,
} from '@augment-vir/common';
import {isStrictEqual} from 'run-time-assertions';
import {Simplify, Writable} from 'type-fest';
import {RemoveListenerCallback} from 'typed-event-target';
import {AnyObservable, ObservableListener} from './any-observable';
import {EqualityCheck} from './equality-check';
import {AllowNoUpdate, ExcludeNoUpdate, isNotNoUpdate, noUpdate} from './no-update';
import {ObservableValueErrorEvent, ObservableValueResolveEvent} from './observable-events';

/**
 * The possible types for an async observable's value, each representing a different potential phase
 * in the promise lifecycle.
 */
export type AsyncValue<Value> = Error | Promise<ExcludeNoUpdate<Value>> | ExcludeNoUpdate<Value>;

/** Constructor input for the async observable class. */
export type AsyncObservableInit<Value> = Partial<{
    /** Starting value */
    defaultValue: Promise<ExcludeNoUpdate<Value>> | ExcludeNoUpdate<Value>;
    /**
     * Callback to use to check equality between the current value and new values from
     * `.setValue()`. If the current value and the new value are equal, the new value will not be
     * set and no listeners will be called. Set this to undefined to disable equality checking,
     * which will then set values and fire listeners for every call of `.setValue()`.
     *
     * @default strict reference equality
     */
    equalityCheck: EqualityCheck<Simplify<ExcludeNoUpdate<Value>>> | undefined;
}>;

/**
 * An observable that can handle promises and updates listeners for each stage in the promise
 * lifecycle. It also stores the last resolved value.
 *
 * @category Main
 */
export class AsyncObservable<Value> extends AnyObservable {
    /**
     * The function used to check equality between different values. This can be manually set at any
     * time to change the function used.
     */
    public override equalityCheck: NonNullable<AsyncObservableInit<Value>['equalityCheck']>;
    protected waitingForValueDeferredPromise =
        createDeferredPromiseWrapper<ExcludeNoUpdate<Value>>();
    protected lastSetPromise: Promise<ExcludeNoUpdate<Value>> | undefined;
    /** Used to prevent setting different values from racing with each other. */
    protected lastSetId = randomString();
    /**
     * The value which this observable currently contains. In this `AsyncObservable`, `value` may be
     * a promise, a resolved value, or an error.
     *
     * Do not set this directly. Use `setValue` instead.
     */
    public override readonly value: AsyncValue<Value> = this.waitingForValueDeferredPromise.promise;
    /**
     * The last resolved value. This only changes when `value` is set to a resolved value or when a
     * promise `value` resolves.
     *
     * Do not set this directly. Use `setValue` instead.
     */
    public readonly lastResolvedValue: ExcludeNoUpdate<Value> | undefined = undefined;

    constructor(init: Readonly<AsyncObservableInit<Value>> = {}) {
        super();
        this.equalityCheck = init.equalityCheck || isStrictEqual;

        if ('defaultValue' in init) {
            this.setValue(init.defaultValue);
        }
    }

    protected setPromise(newPromise: Promise<ExcludeNoUpdate<Value>>): boolean {
        if (newPromise === this.lastSetPromise) {
            /** Abort setting the promise if we already have set this promise. */
            return false;
        }
        const newSetId = randomString();
        this.lastSetId = newSetId;
        this.lastSetPromise = newPromise;

        if (this.waitingForValueDeferredPromise.isSettled()) {
            this.waitingForValueDeferredPromise = createDeferredPromiseWrapper();
            super.setValue(this.waitingForValueDeferredPromise.promise, isStrictEqual);
        }

        newPromise
            .then((value) => {
                /** Do nothing if we're not actually waiting for this promise anymore. */
                if (this.lastSetPromise !== newPromise || this.lastSetId !== newSetId) {
                    return;
                }
                this.resolveValue(value);
            })
            .catch((reason: unknown) => {
                /** Do nothing if we're not actually waiting for this promise anymore. */
                if (this.lastSetPromise !== newPromise || this.lastSetId !== newSetId) {
                    return;
                }
                this.waitingForValueDeferredPromise.promise.catch(() => {
                    /**
                     * Don't actually do anything, we just want to make sure the error is handled so
                     * it doesn't throw errors in the browser.
                     */
                });

                const error = ensureError(reason);
                console.error(error);

                this.rejectValue(error);
            });

        return true;
    }

    protected resolveValue(value: ExcludeNoUpdate<Value>): boolean {
        if (
            value === noUpdate ||
            !super.setValue(value, this.value instanceof Promise ? isStrictEqual : undefined)
        ) {
            return false;
        }
        (this as Writable<typeof this>).lastResolvedValue = value as typeof this.lastResolvedValue;

        this.lastSetId = randomString();
        if (!this.waitingForValueDeferredPromise.isSettled()) {
            this.waitingForValueDeferredPromise.resolve(value);
        }
        this.dispatch(new ObservableValueResolveEvent({detail: value}));
        return true;
    }

    protected rejectValue(error: Error) {
        this.waitingForValueDeferredPromise.reject(error);
        super.setValue(error, isStrictEqual);
        this.dispatch(new ObservableValueErrorEvent({detail: error}));
    }

    /**
     * Set a new value to the observable. If a promise is used, `value` will be set to the promise
     * and `value` will be automatically overridden with the resolution or rejection result of the
     * promise once it's available.
     *
     * New resolved values will only be set and listeners will only be fired if it is not equal to
     * the current value (as determined by `equalityCheck`).
     *
     * @returns `true` if the new value was set, `false` otherwise.
     */
    public override setValue(
        value: AllowNoUpdate<Error | MaybePromise<ExcludeNoUpdate<Value>>>,
    ): boolean {
        try {
            if (value instanceof Promise) {
                return this.setPromise(value);
            } else if (value instanceof Error) {
                this.rejectValue(value);
                return true;
            } else if (!isNotNoUpdate(value)) {
                return false;
            } else {
                return this.resolveValue(value);
            }
        } catch (error) {
            this.rejectValue(ensureError(error));
            return true;
        }
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
        callback: ObservableListener<Value>,
    ): RemoveListenerCallback {
        return super.listen(fireImmediately, callback);
    }
}
