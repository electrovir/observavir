import {MaybePromise, Overwrite, PartialAndUndefined, wrapInTry} from '@augment-vir/common';
import {
    AnyDuration,
    DurationUnit,
    FullDate,
    calculateRelativeDate,
    convertDuration,
    getNowInUserTimezone,
    isDateAfter,
} from 'date-vir';
import {Writable} from 'type-fest';
import {CallbackObservable, CallbackObservableInit, UpdateCallback} from './callback-observable';
import {IncludeNoUpdate} from './no-update';
import {
    ObservableIntervalRateLimitedEvent,
    ObservableIntervalRunEvent,
    ObservableIntervalSkipEvent,
} from './observable-events';

/** Constructor input for the interval observable class. */
export type IntervalObservableInit<Value, Params> = Overwrite<
    CallbackObservableInit<Value, Params>,
    PartialAndUndefined<{
        /** The duration between automatic interval updates. Multiple duration units can be set. */
        intervalDuration: AnyDuration;
        /**
         * When a trigger changes (according to the `equalityCheck`), this `updateCallback` will be
         * called and the observable's value will be updated again if it generates a new value.
         * Otherwise, the `updateCallback` callback will only be called the first time (if there is
         * no `defaultValue` init).
         */
        updateCallback: UpdateCallback<Value, Params>;
        /**
         * The minimum duration between updates. If multiple automatic or manual triggers occur
         * within this duration, only the first one will trigger actual updates.
         */
        rateLimit: AnyDuration;
        /**
         * If set to true, the interval observable will not automatically start its interval. By
         * default, the interval observable starts its interval immediately upon construction.
         *
         * @default false
         */
        startPaused: boolean;
    }>
>;

/**
 * A variation of the callback observable that automatically calls the callback to update itself at
 * a regular interval.
 *
 * @category Main
 */
export class IntervalObservable<Value, Params> extends CallbackObservable<Value, Params> {
    /**
     * The duration between update intervals. This can be manually modified at any time to affect
     * the interval for the next update.
     */
    public intervalDuration: AnyDuration | undefined;
    /**
     * The minimum duration between updates. Any extra value sets or interval updates within this
     * duration will be ignored.
     */
    public rateLimit: AnyDuration | undefined;
    /**
     * The last time a value was set.
     *
     * Do not set this externally, it's simply for informational purposes.
     */
    public readonly lastSetTime: FullDate | undefined;
    protected currentTimeoutId: undefined | number | NodeJS.Timeout;

    constructor(init: IntervalObservableInit<Value, Params> = {}) {
        super(init as CallbackObservableInit<Value, Params>);
        this.intervalDuration = init.intervalDuration;
        this.rateLimit = init.rateLimit;

        if (
            !init.startPaused &&
            this.updateCallback &&
            this.internalParams !== CallbackObservable.NotSet
        ) {
            this.resumeInterval();
        }
    }

    protected setInterval() {
        const duration =
            this.intervalDuration &&
            convertDuration(this.intervalDuration, DurationUnit.Milliseconds);

        if (!duration) {
            const reasons = {hasInterval: false};
            this.dispatch(
                new ObservableIntervalSkipEvent({
                    detail: reasons,
                }),
            );
            console.warn(`Skipped ${IntervalObservable.name} interval:`, reasons);
            return;
        }

        const timeoutId = globalThis.setTimeout(() => {
            /** Skip the interval if it's no longer the current interval. */
            /* c8 ignore next 3: covering an edge case potential race condition */
            if (this.currentTimeoutId !== timeoutId) {
                return;
            }

            /* c8 ignore next 6 edge case covering */
            try {
                this.runInterval();
            } catch (error) {
                console.error(error);
                throw error;
            }
        }, duration.milliseconds);

        globalThis.clearTimeout(this.currentTimeoutId);

        this.currentTimeoutId = timeoutId;
    }

    /** @returns `true` if the interval triggered an update, `false` otherwise. */
    protected runInterval(): boolean {
        const hasCallback: boolean = !!this.updateCallback;
        const hasParams: boolean = this.internalParams !== CallbackObservable.NotSet;

        const reasons = {hasCallback, hasParams};

        /* c8 ignore next 5: just covering a potential edge case */
        wrapInTry(() => this.setInterval(), {
            handleError(error) {
                console.error(error);
            },
        });

        if (hasCallback && hasParams) {
            this.dispatch(new ObservableIntervalRunEvent({detail: this.internalParams}));
            return this.forceUpdate();
        } else {
            this.dispatch(new ObservableIntervalSkipEvent({detail: reasons}));
            console.warn(`Skipped ${IntervalObservable.name} interval:`, reasons);

            return false;
        }
    }

    /**
     * @returns `true` if the operation should _not_ proceed due to rate limiting, otherwise
     *   `false`.
     */
    protected isRateLimited(): boolean {
        if (this.rateLimit && this.lastSetTime) {
            if (
                !isDateAfter({
                    fullDate: getNowInUserTimezone(),
                    relativeTo: calculateRelativeDate(this.lastSetTime, this.rateLimit),
                })
            ) {
                this.dispatch(new ObservableIntervalRateLimitedEvent({detail: this.lastSetTime}));
                return true;
            }
        }

        return false;
    }

    /**
     * Updates the internal value by calling `updateCallback`. Also ensure that rate limits are
     * enforced.
     *
     * @throws `Error` if `updateCallback` or params have not been set yet.
     */
    protected override updateFromCallback(): boolean {
        if (this.isRateLimited()) {
            return false;
        }

        return super.updateFromCallback();
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
    public override setValue(value: Error | MaybePromise<IncludeNoUpdate<Value>>): boolean {
        if (this.isRateLimited()) {
            return false;
        }

        (this as Writable<typeof this>).lastSetTime = getNowInUserTimezone();

        return super.setValue(value);
    }

    /**
     * Immediately update the observable and start the interval.
     *
     * @returns Whether or not the interval started. This will be `false`, for example, if the
     *   interval is already running.
     */
    public resumeInterval(): boolean {
        if (this.currentTimeoutId == undefined) {
            this.runInterval();
            return true;
        } else {
            return false;
        }
    }

    /**
     * Immediately stop the observable's interval.
     *
     * @returns Whether or not the interval was stopped. This will be `false`, for example, if the
     *   interval was already stopped.
     */
    public pauseInterval(): boolean {
        if (this.currentTimeoutId == undefined) {
            return false;
        } else {
            /* c8 ignore next 5: this is just to cover clearTimeout potentially freaking out */
            wrapInTry(() => globalThis.clearTimeout(this.currentTimeoutId), {
                handleError(error) {
                    console.error(error);
                },
            });
            this.currentTimeoutId = undefined;
            return true;
        }
    }

    /** Clean up all listeners and any other internal state. */
    public override destroy() {
        this.pauseInterval();
        super.destroy();
    }
}
