import {assert, check} from '@augment-vir/assert';
import {type MaybePromise, getOrSet, wait} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {IntervalObservable, type IntervalObservableInit} from './interval-observable.js';
import {noUpdate} from './no-update.js';
import {
    type ObservableEventTypes,
    ObservableValueUpdateEvent,
    allObservableEvents,
} from './observable-events.js';

describe(IntervalObservable.name, () => {
    async function testIntervalObservable(
        callback: (instance: IntervalObservable<any, any>) => MaybePromise<void>,
        init: IntervalObservableInit<any, any>,
    ) {
        const events: Partial<Record<ObservableEventTypes, string[]>> = {};

        const equalityChecks: [any, any][] = [];

        const instance = new IntervalObservable({
            equalityCheck(a: any, b: any) {
                equalityChecks.push([
                    a,
                    b,
                ]);
                return check.strictEquals(a, b);
            },
            ...init,
            startPaused: true,
        });

        allObservableEvents.forEach((observableEvent) => {
            instance.listenToEvent(observableEvent, (event) => {
                const eventsByType = getOrSet(events, event.type, () => []);

                eventsByType.push(
                    'detail' in event
                        ? event instanceof ObservableValueUpdateEvent
                            ? String(event.detail[0])
                            : String(event.detail)
                        : 'fired',
                );
            });
        });

        /** Setup all listeners before starting the interval. */
        if (!init.startPaused) {
            instance.resumeInterval();
        }

        await callback(instance);

        instance.removeAllListeners();
        instance.destroy();

        return {
            ...events,
            ...(equalityChecks.length ? {equalityChecks} : {}),
            finalValue: String(instance.value),
            finalResolvedValue: String(instance.lastResolvedValue),
        };
    }

    itCases(testIntervalObservable, [
        {
            it: 'blocks multiple updates within the rate limit',
            inputs: [
                async (instance) => {
                    instance.update(1);
                    instance.update(2);
                    instance.update(3);
                    instance.setValue('fake value');
                    await wait({seconds: 4.5});
                    instance.update(4);
                },
                {
                    rateLimit: {seconds: 3},
                    updateCallback(param: number) {
                        return param.toFixed(2);
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                    'fired',
                ],
                'observable-interval-skip': [
                    '[object Object]',
                    '[object Object]',
                ],
                'observable-interval-rate-limited': [
                    '[object Object]',
                    '[object Object]',
                    '[object Object]',
                ],
                'observable-params-update': [
                    '1',
                    '2',
                    '3',
                    '4',
                ],
                'observable-value-resolve': [
                    '1.00',
                    '4.00',
                ],
                'observable-value-update': [
                    '1.00',
                    '4.00',
                ],
                equalityChecks: [
                    [
                        2,
                        1,
                    ],
                    [
                        3,
                        2,
                    ],
                    [
                        4,
                        3,
                    ],
                    [
                        '1.00',
                        '4.00',
                    ],
                ],
                finalResolvedValue: '4.00',
                finalValue: '4.00',
            },
        },
        {
            it: 'automatically updates',
            inputs: [
                async () => {
                    await wait({seconds: 4.5});
                },
                {
                    defaultParams: 2,
                    intervalDuration: {seconds: 3},
                    updateCallback(param: number) {
                        return param.toFixed(2);
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                    'fired',
                ],
                'observable-interval-run': [
                    '2',
                    '2',
                ],
                'observable-value-resolve': [
                    '2.00',
                ],
                'observable-value-update': [
                    '2.00',
                ],
                equalityChecks: [
                    [
                        '2.00',
                        '2.00',
                    ],
                ],
                finalResolvedValue: '2.00',
                finalValue: '2.00',
            },
        },
        {
            it: 'pauses and resumes updates',
            inputs: [
                async (instance) => {
                    await wait({seconds: 4.5});
                    instance.pauseInterval();
                    await wait({seconds: 4.5});
                    instance.resumeInterval();
                },
                {
                    defaultParams: 2,
                    intervalDuration: {seconds: 3},
                    updateCallback(param: number) {
                        return param.toFixed(2);
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                    'fired',
                    'fired',
                ],
                'observable-interval-run': [
                    '2',
                    '2',
                    '2',
                ],
                'observable-value-resolve': [
                    '2.00',
                ],
                'observable-value-update': [
                    '2.00',
                ],
                equalityChecks: [
                    [
                        '2.00',
                        '2.00',
                    ],
                    [
                        '2.00',
                        '2.00',
                    ],
                ],
                finalResolvedValue: '2.00',
                finalValue: '2.00',
            },
        },
        {
            it: 'does nothing when resumeInterval is called on a running interval',
            inputs: [
                async (instance) => {
                    assert.isFalse(instance.resumeInterval());
                    await wait({seconds: 4.5});
                },
                {
                    defaultParams: 2,
                    intervalDuration: {seconds: 3},
                    updateCallback(param: number) {
                        return param.toFixed(2);
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                    'fired',
                ],
                'observable-interval-run': [
                    '2',
                    '2',
                ],
                'observable-value-resolve': [
                    '2.00',
                ],
                'observable-value-update': [
                    '2.00',
                ],
                equalityChecks: [
                    [
                        '2.00',
                        '2.00',
                    ],
                ],
                finalResolvedValue: '2.00',
                finalValue: '2.00',
            },
        },
        {
            it: 'does nothing when pauseInterval is called on a stopped interval',
            inputs: [
                async (instance) => {
                    assert.isFalse(instance.pauseInterval());
                    await wait({seconds: 4.5});
                },
                {
                    defaultParams: 2,
                    intervalDuration: {seconds: 3},
                    startPaused: true,
                    updateCallback(param: number) {
                        return param.toFixed(2);
                    },
                },
            ],
            expect: {
                finalResolvedValue: 'undefined',
                finalValue: '[object Promise]',
            },
        },
        {
            it: 'does not update for noUpdate',
            inputs: [
                async () => {
                    await wait({seconds: 1});
                },
                {
                    defaultParams: undefined,
                    intervalDuration: {seconds: 10},
                    updateCallback() {
                        return noUpdate;
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                ],
                'observable-interval-run': [
                    'null',
                ],
                finalResolvedValue: 'undefined',
                finalValue: '[object Promise]',
            },
        },
    ]);

    it('pauses updates when destroying', async () => {
        let updateCount = 0;

        const instance = new IntervalObservable({
            defaultParams: undefined,
            intervalDuration: {milliseconds: 10},
            updateCallback() {
                updateCount++;
                return 'hi';
            },
        });

        await wait({seconds: 1});

        assert.isAbove(updateCount, 2);

        instance.destroy();
        const updateCountAfterDestroy = updateCount;

        await wait({seconds: 1});

        assert.isBelow(updateCount, updateCountAfterDestroy + 5);
    });

    it('sets values and fires listeners on every setValue call when equalityCheck is undefined', () => {
        const results: string[] = [];

        const instance = new IntervalObservable({
            defaultValue: 'hi',
            equalityCheck: undefined,
            startPaused: true,
        });

        instance.listen(false, (newValue) => {
            results.push(newValue);
        });

        instance.setValue('hi');
        instance.setValue('hi');
        instance.setValue('hi');

        instance.destroy();

        assert.deepEquals(results, [
            'hi',
            'hi',
            'hi',
        ]);
    });
});
