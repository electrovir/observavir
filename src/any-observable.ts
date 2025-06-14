import {type MaybePromise} from '@augment-vir/common';
import {type Writable} from 'type-fest';
import {
    type ExtractEventByType,
    type ExtractEventTypes,
    type ListenOptions,
    ListenTarget,
    type RemoveListenerCallback,
    type TypedEventListenerWithRemoval,
} from 'typed-event-target';
import {type EqualityCheck} from './equality-check.js';
import {noUpdate} from './no-update.js';
import {type ObservableBase} from './observable-base.js';
import {
    ObservableDestroyEvent,
    type ObservableEvents,
    ObservableValueUpdateEvent,
} from './observable-events.js';

/**
 * A callback for listening to observable value changes.
 *
 * @category Internal
 */
export type ObservableListener<Value> = (value: Value) => MaybePromise<void>;

/**
 * A non-type-safe observable implementation meant as a base for more advanced, type safe
 * observables like `Observable` or `AsyncObservable`, etc.
 *
 * @category Internal
 */
export abstract class AnyObservable implements ObservableBase {
    private listenTarget = new ListenTarget<ObservableEvents>();

    /**
     * The value currently contained with the observable.
     *
     * Do not set this directly: use `setValue` instead. (If you try to set this value directly, it
     * won't fire listeners which defeats the entire purpose of using an observable.
     */
    public value: any;
    /**
     * The function used to check equality between different values. This can be manually set at any
     * time to change the function used.
     */
    public equalityCheck: EqualityCheck<any> | undefined;

    /**
     * This is necessary so we can fire listeners that listen directly to the value, not the emitted
     * event.
     */
    protected readonly listenerMap = new WeakMap<
        ObservableListener<any>,
        TypedEventListenerWithRemoval<
            ExtractEventByType<ObservableValueUpdateEvent, ObservableValueUpdateEvent['type']>
        >
    >();

    /**
     * Dispatch a typed event. Causes all attached listeners listening to this event to be fired.
     *
     * @returns The number of listeners that were fired.
     */
    protected dispatch(...args: Parameters<typeof this.listenTarget.dispatch>) {
        return this.listenTarget.dispatch(...args);
    }

    /**
     * Remove all currently attached event listeners.
     *
     * @returns The number of listeners that were removed.
     */
    public removeAllListeners() {
        return this.listenTarget.removeAllListeners();
    }

    /**
     * Get a count of all currently attached listeners. If a listener is removed, it will no longer
     * be counted.
     */
    public getListenerCount() {
        return this.listenTarget.getListenerCount();
    }

    /**
     * Set a new value to the observable. The new value will only be set and listeners will only be
     * fired if the new value is not equal to the current value ("equal" determined by the
     * `equalityCheck` constructor parameter) or if equality checking is disabled.
     *
     * @returns `true` if the new value was set, `false` otherwise.
     */
    public setValue(
        ...args: [
            newValue: any,
            /**
             * Omit to use internal equality check. Set `undefined` to bypass equality check. Set to
             * an equality check function to use it in place of the internal equality check.
             */
            equalityCheck?: EqualityCheck<any> | undefined,
        ]
    ): boolean {
        const newValue = args[0];

        if (newValue === noUpdate) {
            return false;
        }
        const equalityCheck = args.length === 2 ? args[1] : this.equalityCheck;

        if (!equalityCheck?.(this.value, newValue)) {
            (this as Writable<typeof this>).value = newValue;
            this.listenTarget.dispatch(new ObservableValueUpdateEvent({detail: newValue}));
            return true;
        }

        return false;
    }

    /**
     * Listen to changes in the observable's value.
     *
     * @returns A callback to remove the listener.
     */
    public listen(
        /** If true, the callback will immediately be fired with whatever the current value is. */
        fireImmediately: boolean,
        /** The callback to fire when a new value is set on the observable. */
        callback: ObservableListener<any>,
    ): RemoveListenerCallback {
        const mapped = (event: ObservableValueUpdateEvent) => {
            return callback(event.detail);
        };
        this.listenerMap.set(callback, mapped);

        if (fireImmediately) {
            void callback(this.value);
        }

        return this.listenTarget.listen(ObservableValueUpdateEvent, mapped);
    }

    /**
     * Removes a listener from the observable.
     *
     * @returns `true` if the callback was removed. `false` if the callback was not removed (meaning
     *   it was never added in the first place).
     */
    public removeListener(callback: ObservableListener<any>): boolean {
        const mapped = this.listenerMap.get(callback);
        return !!mapped && this.listenTarget.removeListener(ObservableValueUpdateEvent, mapped);
    }

    /** Clean up all listeners and any other internal state. */
    public destroy(): void {
        this.listenTarget.dispatch(new ObservableDestroyEvent());
        this.listenTarget.destroy();
    }

    /**
     * Listen to any event omitted by the observable rather than just the value changing.
     *
     * @returns A callback to remove the listener.
     */
    public listenToEvent<
        const EventDefinition extends Readonly<{
            type: ExtractEventTypes<ObservableEvents>;
        }>,
    >(
        eventDefinition: EventDefinition,
        listenerCallback: TypedEventListenerWithRemoval<
            ExtractEventByType<ObservableEvents, EventDefinition['type']>
        >,
        options?: ListenOptions | undefined,
    ): RemoveListenerCallback {
        return this.listenTarget.listen(eventDefinition, listenerCallback, options);
    }
}
