import {MaybePromise, ensureError, isLengthAtLeast} from '@augment-vir/common';
import {isLooseJsonEqual} from 'run-time-assertions';
import {Simplify} from 'type-fest';
import {AsyncObservable} from './async-observable';
import {EqualityCheck} from './equality-check';
import {ObservableCallbackCallEvent, ObservableParamsUpdateEvent} from './observable-events';

/** Type for update callback provided to the callback observable class, used to update its value. */
export type UpdateCallback<Value, Params> =
    Exclude<Params, undefined> extends never ? () => Value : (params: Params) => Value;

/** Constructor input for the callback observable class. */
export type CallbackObservableInit<Value, Params = undefined> = Partial<{
    /** Starting value */
    defaultValue: Promise<Awaited<Value>> | Awaited<Value>;
    /**
     * When a trigger changes (according to the `equalityCheck`), this `updateCallback` will be
     * called and the observable's value will be updated again if it generates a new value.
     * Otherwise, the `updateCallback` callback will only be called the first time (if there is no
     * `defaultValue` init).
     */
    updateCallback: UpdateCallback<MaybePromise<Awaited<Value>>, Params> | undefined;
    /**
     * Callback to use to check equality between the current value and new values from
     * `.setValue()`. If the current value and the new value are equal, the new value will not be
     * set and no listeners will be called. Set this to undefined to disable equality checking,
     * which will then set values and fire listeners for every call of `.setValue()`.
     *
     * @default json equality
     */
    equalityCheck: EqualityCheck<Simplify<Awaited<Value>> | Params> | undefined;
    /**
     * Starting parameters to use for `updateCallback`. Can be omitted entirely and set later with
     * `updateTrigger` or `forceUpdate`.
     */
    defaultParams: Params;
}>;

/**
 * An observable that updates its value by calling a provided callback with the provided parameters.
 * The callback will only be triggered if the parameters change.
 *
 * @category Main
 */
export class CallbackObservable<Value, Params = undefined> extends AsyncObservable<Value> {
    protected static readonly NotSet = Symbol('not set');

    /** The callback to call for updating `value`. Uses `lastParams` as its inputs. */
    public updateCallback: UpdateCallback<MaybePromise<Awaited<Value>>, Params> | undefined;
    /**
     * The function used to check equality between different values for params or `value`. This can
     * be manually set at any time to change the function used.
     */
    public override equalityCheck: EqualityCheck<Simplify<Awaited<Value>> | Params>;
    /**
     * The last params for `updateCallback`. This can be set by the constructor, `updateTrigger`,
     * `forceUpdate`, or by `setParams`.
     *
     * Do not set this directly. Use `setParams` instead.
     */
    public get lastParams() {
        if (this.internalParams === CallbackObservable.NotSet) {
            return undefined;
        } else {
            return this.internalParams;
        }
    }

    protected internalParams: Params | typeof CallbackObservable.NotSet;

    constructor(init: Readonly<CallbackObservableInit<Value, Params>> = {}) {
        super(init);
        this.equalityCheck = init.equalityCheck || isLooseJsonEqual;
        this.updateCallback = init.updateCallback;
        this.internalParams =
            'defaultParams' in init ? init.defaultParams : CallbackObservable.NotSet;
    }

    /**
     * Updates the internal value by calling `updateCallback`.
     *
     * @throws `Error` if `updateCallback` or params have not been set yet.
     */
    protected updateFromCallback(): boolean {
        if (!this.updateCallback) {
            throw new TypeError('Cannot update value: updateCallback was never set.');
        } else if (this.internalParams === CallbackObservable.NotSet) {
            throw new TypeError('Cannot update value: params were never set.');
        }

        try {
            return this.setValue(this.updateCallback(this.internalParams));
        } catch (error) {
            return this.setValue(ensureError(error));
            /* c8 ignore next: idk why it can't figure out this next line is covered */
        } finally {
            this.dispatch(new ObservableCallbackCallEvent());
        }
    }

    /** @returns `true` if new params were set, otherwise `false`. */
    protected updateLastParams(newParams: Params): boolean {
        try {
            if (
                this.internalParams === CallbackObservable.NotSet ||
                !this.equalityCheck(newParams, this.internalParams)
            ) {
                this.internalParams = newParams;
                this.dispatch(new ObservableParamsUpdateEvent({detail: this.internalParams}));
                return true;
            }

            return false;
        } catch (error) {
            this.setValue(ensureError(error));
            return false;
        }
    }

    /**
     * Update the params for `updateCallback`. If the params are not equal to the previous params
     * (according to the provided or default `equalityCheck`), `updateCallback` will be called and
     * will update `value`.
     *
     * @returns `true` if calling this triggered an update, `false` otherwise.
     * @throws `Error` if `updateCallback` or params have not been set yet.
     */
    public update(
        /**
         * This complicated params type allows the args to be empty if Params is undefined but
         * requires arguments otherwise.
         */
        ...[params]: Exclude<Params, undefined> extends never ? [] : [Params]
    ): boolean {
        if (!this.updateLastParams(params as Params)) {
            return false;
        }

        this.updateFromCallback();
        return true;
    }

    /**
     * Updates params without triggering updates.
     *
     * @returns `true` if the params were updated, `false` otherwise.
     */
    public setParams(params: Params): boolean {
        return this.updateLastParams(params);
    }

    /**
     * Force `updateCallback` to be called again regardless of whatever the given params are equal
     * to the previous params or not. `value` will still only be updated if the output of
     * `updateCallback` is new.
     *
     * New params are optional here. If none are provided, the last set parameters are used.
     *
     * @throws `Error` if `updateCallback` or params have not been set yet.
     */
    public forceUpdate(...args: [Params?]): boolean {
        const hasInputParams = isLengthAtLeast(args, 1);

        if (hasInputParams) {
            this.updateLastParams(args[0]);
        }

        return this.updateFromCallback();
    }
}
