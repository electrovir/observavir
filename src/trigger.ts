import {makeWritable} from '@augment-vir/common';
import {type RemoveListenerCallback} from 'typed-event-target';
import {type ObservableListener} from './any-observable.js';
import {type ObservableBase} from './observable-base.js';
import {Observable} from './observable.js';

/**
 * An observable meant for one-off commands rather than state. Same as {@link Observable} except that
 * values are set with `.trigger()`, every `.trigger()` call fires listeners (even when the same
 * value is sent twice), and there is no `.value` property. Read the value with `.consumeValue()`
 * instead: every call after the first returns `undefined` until `.trigger()` is called again.
 *
 * `.consumeValue()` only yields the most recent trigger: earlier unread triggers are dropped. Use
 * `.listen()` to receive every trigger.
 *
 * @category Observable
 * @example Reading a triggered value
 *
 * ```ts
 * import {Trigger} from 'observavir';
 *
 * const commands = new Trigger<string>();
 *
 * commands.consumeValue(); // undefined
 * commands.trigger('open');
 * commands.consumeValue(); // 'open'
 * commands.consumeValue(); // undefined (already consumed)
 * ```
 *
 * @example Triggering without a value
 *
 * ```ts
 * import {Trigger} from 'observavir';
 *
 * const refresh = new Trigger<void>();
 *
 * refresh.consumeTrigger(); // false
 * refresh.trigger();
 * refresh.consumeTrigger(); // true
 * refresh.consumeTrigger(); // false (already consumed)
 * ```
 *
 * @example Listening to every trigger
 *
 * ```ts
 * import {Trigger} from 'observavir';
 *
 * const commands = new Trigger<string>();
 *
 * commands.listen(false, (command) => {
 *     // fires twice with 'open', listeners do not consume the value
 * });
 *
 * commands.trigger('open');
 * commands.trigger('open');
 * commands.consumeValue(); // 'open'
 * ```
 */
export class Trigger<Value> implements ObservableBase {
    /** Indicates whether the current value has been read or not. */
    public readonly hasTrigger: boolean = false;
    protected readonly observable = new Observable<Value | undefined>({
        defaultValue: undefined,
        /** Always trigger. */
        equalityCheck: undefined,
    });

    /**
     * Gives you the most recent triggered value if the trigger has not been consumed. In order to
     * distinguish `void` or `undefined` set values from the trigger being consumed, use
     * `consumeTrigger()` instead.
     *
     * @returns
     *
     *   - The latest unconsumed trigger value, if any.
     *   - `undefined` is there is no unconsumed trigger.
     */
    public consumeValue(): Value | undefined {
        if (this.consumeTrigger()) {
            return this.observable.value;
        } else {
            return undefined;
        }
    }

    /** Set a new value and fire all listeners, regardless of the current value. */
    public trigger(newValue: Awaited<Value>) {
        makeWritable(this).hasTrigger = true;
        return this.observable.setValue(newValue);
    }

    /**
     * Tells you if there's an unconsumed trigger, and then consumes it. Does not return the
     * trigger's value, use `.consumeValue()` for that.
     *
     * @returns
     *
     *   - `true`: if a trigger has not yet been consumed.
     *   - `false`: if the trigger has already been consumed.
     */
    public consumeTrigger(): boolean {
        if (this.hasTrigger) {
            makeWritable(this).hasTrigger = false;
            return true;
        } else {
            return false;
        }
    }

    /**
     * Listen to triggered values. Listeners receive the value directly and do not consume it.
     *
     * @returns A callback to remove the listener.
     */
    public listen(
        /**
         * If true, the callback will immediately be fired with whatever the last triggered value
         * is.
         */
        fireImmediately: boolean,
        /** The callback to fire when `.trigger()` is called. */
        callback: ObservableListener<Value | undefined>,
    ): RemoveListenerCallback {
        return this.observable.listen(fireImmediately, callback);
    }

    /**
     * Removes a listener from the trigger.
     *
     * @returns `true` if the callback was removed. `false` if the callback was not removed (meaning
     *   it was never added in the first place).
     */
    public removeListener(callback: ObservableListener<Value | undefined>): boolean {
        return this.observable.removeListener(callback);
    }

    /** Clean up all listeners and any other internal state. */
    public destroy(): void {
        this.observable.destroy();
    }
}
