import {type ArrayElement} from '@augment-vir/common';
import {type FullDate} from 'date-vir';
import {defineTypedCustomEvent, defineTypedEvent} from 'typed-event-target';

/**
 * This event is emitted from observables when their internal value is updated.
 *
 * Observables abstract this event away, you can simply call `.listen()` to listen to an
 * observable's value rather than listening to this specific event.
 *
 * @category Event
 */
export class ObservableValueUpdateEvent extends defineTypedCustomEvent<
    [
        unknown,
        unknown,
    ]
>()('observable-value-update') {}

/**
 * This event is emitted from async observables when their value is resolved.
 *
 * @category Event
 */
export class ObservableValueResolveEvent extends defineTypedCustomEvent<unknown>()(
    'observable-value-resolve',
) {}

/**
 * This event is emitted from async observables when awaiting their value throws an error.
 *
 * @category Event
 */
export class ObservableValueErrorEvent extends defineTypedCustomEvent<Error>()(
    'observable-value-error',
) {}

/**
 * This event is emitted from observables when they are destroyed.
 *
 * @category Event
 */
export class ObservableDestroyEvent extends defineTypedEvent('observable-destroy') {}

/**
 * This event is emitted from callback observables when their callback is called.
 *
 * @category Event
 */
export class ObservableCallbackCallEvent extends defineTypedEvent('observable-callback-call') {}

/**
 * This event is emitted from callback observables when their params are updated.
 *
 * @category Event
 */
export class ObservableParamsUpdateEvent extends defineTypedCustomEvent<unknown>()(
    'observable-params-update',
) {}

/**
 * This event is emitted from interval observables when the interval is run.
 *
 * @category Event
 */
export class ObservableIntervalRunEvent extends defineTypedCustomEvent</* The interval's params. */ unknown>()(
    'observable-interval-run',
) {}

/**
 * This event is emitted from interval observables when the interval is skipped for whatever reason.
 * The event detail will contain information about why the interval was skipped.
 *
 * @category Event
 */
export class ObservableIntervalSkipEvent extends defineTypedCustomEvent<
    /* Reasons for skipping. */ Record<string, boolean>
>()('observable-interval-skip') {}

/**
 * This event is emitted from interval observables when and update or value set is blocked due to
 * rate limiting.
 *
 * @category Event
 */
export class ObservableIntervalRateLimitedEvent extends defineTypedCustomEvent</* The last set time. */ FullDate>()(
    'observable-interval-rate-limited',
) {}

/**
 * All possible observable event constructors in a single array.
 *
 * @category Event
 */
export const allObservableEvents = [
    ObservableValueUpdateEvent,
    ObservableValueResolveEvent,
    ObservableValueErrorEvent,
    ObservableDestroyEvent,
    ObservableCallbackCallEvent,
    ObservableParamsUpdateEvent,
    ObservableIntervalRunEvent,
    ObservableIntervalSkipEvent,
    ObservableIntervalRateLimitedEvent,
] as const;

/**
 * A union of all possible observable event class types.
 *
 * @category Event
 */
export type ObservableEvents = InstanceType<ArrayElement<typeof allObservableEvents>>;
/**
 * A union of all possible event type strings from each observable event class.
 *
 * @category Event
 */
export type ObservableEventTypes = ObservableEvents['type'];
