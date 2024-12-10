import {assert, check, waitUntil} from '@augment-vir/assert';
import {DeferredPromise, MaybePromise, getOrSet, randomString, wait} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {AsyncValue} from './async-observable.js';
import {CallbackObservable, CallbackObservableInit} from './callback-observable.js';
import {noUpdate} from './no-update.js';
import {ObservableEventTypes, allObservableEvents} from './observable-events.js';

describe(CallbackObservable.name, () => {
    it('has correct types', () => {
        const instance = new CallbackObservable({
            defaultValue: 'hello',
            updateCallback({value1, value2}: {value1: string; value2: number}) {
                return value1.repeat(value2);
            },
        });

        instance.equalityCheck = (a, b) => {
            /** The equality check must account for both params and values. */
            assert.tsType(a).equals<string | {value1: string; value2: number}>();
            assert.tsType(b).equals<string | {value1: string; value2: number}>();
            return check.strictEquals(a, b);
        };

        // @ts-expect-error: update inputs should be the params
        instance.update('hi');
        assert.tsType(instance.value).equals<AsyncValue<string>>();
        assert.instanceOf<any>(instance.value, Error);

        instance.update({
            value1: 'hi ',
            value2: 3,
        });

        assert.strictEquals(instance.value, 'hi hi hi ' as string);

        /** Can be called without params. */
        instance.forceUpdate();

        instance.setValue('hi');
        assert.strictEquals(instance.value, 'hi');
    });

    async function testCallbackObservable(
        callback: (instance: CallbackObservable<any, any>) => MaybePromise<void>,
        init?: CallbackObservableInit<any, any>,
    ) {
        const events: Partial<Record<ObservableEventTypes, string[]>> = {};

        const equalityChecks: [any, any][] = [];

        const instance = new CallbackObservable({
            equalityCheck(a, b) {
                equalityChecks.push([
                    a,
                    b,
                ]);
                return check.strictEquals(a, b);
            },
            ...init,
        });

        allObservableEvents.forEach((observableEvent) => {
            instance.listenToEvent(observableEvent, (event) => {
                const eventsByType = getOrSet(events, event.type, () => []);

                eventsByType.push('detail' in event ? String(event.detail) : 'fired');
            });
        });

        await callback(instance);

        return {
            ...events,
            ...(equalityChecks.length ? {equalityChecks} : {}),
            finalValue: String(instance.value),
            finalResolvedValue: String(instance.lastResolvedValue),
        };
    }

    itCases(testCallbackObservable, [
        {
            it: 'errors on forceUpdate without updateCallback',
            inputs: [
                (instance) => {
                    instance.forceUpdate();
                },
            ],
            throws: {
                matchMessage: 'updateCallback was never set',
            },
        },
        {
            it: 'errors on updateTrigger without updateCallback',
            inputs: [
                (instance) => {
                    instance.update('something');
                },
            ],
            throws: {
                matchMessage: 'updateCallback was never set',
            },
        },
        {
            it: 'errors on forceUpdate without params',
            inputs: [
                (instance) => {
                    instance.forceUpdate();
                },
                {
                    updateCallback(param: string) {
                        return param.toUpperCase();
                    },
                },
            ],
            throws: {
                matchMessage: 'params were never set',
            },
        },
        {
            it: 'updates on updateTrigger',
            inputs: [
                (instance) => {
                    instance.update('something');
                },
                {
                    updateCallback(param: string) {
                        return param.toUpperCase();
                    },
                },
            ],
            expect: {
                'observable-callback-call': ['fired'],
                'observable-params-update': ['something'],
                'observable-value-resolve': ['SOMETHING'],
                'observable-value-update': ['SOMETHING'],
                finalValue: 'SOMETHING',
                finalResolvedValue: 'SOMETHING',
            },
        },
        {
            it: 'returns last params',
            inputs: [
                (instance) => {
                    assert.isUndefined(instance.lastParams);
                    instance.setParams('hi');
                    assert.strictEquals(instance.lastParams as unknown, 'hi');
                },
                {
                    updateCallback(param: string) {
                        return param.toUpperCase();
                    },
                },
            ],
            expect: {
                'observable-params-update': [
                    'hi',
                ],
                finalValue: '[object Promise]',
                finalResolvedValue: 'undefined',
            },
        },
        {
            it: 'updates on updateTrigger',
            inputs: [
                (instance) => {
                    instance.update('a');
                    instance.update('b');
                },
                {
                    updateCallback(param: string) {
                        return param.toUpperCase();
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                    'fired',
                ],
                'observable-params-update': [
                    'a',
                    'b',
                ],
                'observable-value-resolve': [
                    'A',
                    'B',
                ],
                'observable-value-update': [
                    'A',
                    'B',
                ],
                equalityChecks: [
                    [
                        'b',
                        'a',
                    ],
                    [
                        'A',
                        'B',
                    ],
                ],
                finalValue: 'B',
                finalResolvedValue: 'B',
            },
        },
        {
            it: 'updates on forceUpdate after params are set',
            inputs: [
                (instance) => {
                    instance.setParams('a');
                    instance.forceUpdate();
                },
                {
                    updateCallback(param: string) {
                        return param.toUpperCase();
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                ],
                'observable-params-update': [
                    'a',
                ],
                'observable-value-resolve': [
                    'A',
                ],
                'observable-value-update': [
                    'A',
                ],
                finalValue: 'A',
                finalResolvedValue: 'A',
            },
        },
        {
            it: "does not update from updateTrigger if params haven't changed",
            inputs: [
                (instance) => {
                    instance.update('a');
                    instance.update('a');
                },
                {
                    updateCallback(param: string) {
                        return param.toUpperCase();
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                ],
                'observable-params-update': [
                    'a',
                ],
                'observable-value-resolve': [
                    'A',
                ],
                'observable-value-update': [
                    'A',
                ],
                equalityChecks: [
                    [
                        'a',
                        'a',
                    ],
                ],
                finalValue: 'A',
                finalResolvedValue: 'A',
            },
        },
        {
            it: "does not update from forceUpdate if params haven't changed",
            inputs: [
                (instance) => {
                    instance.setParams('a');
                    instance.forceUpdate();
                    instance.forceUpdate();
                },
                {
                    updateCallback(param: string) {
                        return param.toUpperCase();
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                    'fired',
                ],
                'observable-params-update': [
                    'a',
                ],
                'observable-value-resolve': [
                    'A',
                ],
                'observable-value-update': [
                    'A',
                ],
                equalityChecks: [
                    [
                        'A',
                        'A',
                    ],
                ],
                finalValue: 'A',
                finalResolvedValue: 'A',
            },
        },
        {
            it: 'handles an async updateCallback',
            inputs: [
                async (instance) => {
                    const deferred = new DeferredPromise<string>();
                    instance.update(deferred.promise);

                    assert.instanceOf(instance.value, Promise);
                    assert.strictEquals(instance.lastResolvedValue, 'init');

                    deferred.resolve('some value');
                    await instance.value;
                },
                {
                    defaultValue: 'init',
                    async updateCallback(param: Promise<string>) {
                        const value = await param;
                        return value.toUpperCase();
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                ],
                'observable-params-update': [
                    '[object Promise]',
                ],
                'observable-value-resolve': [
                    'SOME VALUE',
                ],
                'observable-value-update': [
                    '[object Promise]',
                    'SOME VALUE',
                ],
                finalValue: 'SOME VALUE',
                finalResolvedValue: 'SOME VALUE',
            },
        },
        {
            it: 'sets an error value if a sync updateCallback fails',
            inputs: [
                (instance) => {
                    instance.update('hi');
                },
                {
                    defaultValue: 'init',
                    updateCallback(param: string) {
                        // intentionally test that a non-error can be thrown and handled correctly
                        // eslint-disable-next-line @typescript-eslint/only-throw-error
                        throw 'intentional failure';
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                ],
                'observable-params-update': [
                    'hi',
                ],
                'observable-value-error': [
                    'Error: intentional failure',
                ],
                'observable-value-update': [
                    'Error: intentional failure',
                ],
                finalValue: 'Error: intentional failure',
                finalResolvedValue: 'init',
            },
        },
        {
            it: 'updates params from forceUpdate',
            inputs: [
                (instance) => {
                    instance.forceUpdate('hello');
                },
                {
                    updateCallback(param: string) {
                        return param.toUpperCase();
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                ],
                'observable-params-update': [
                    'hello',
                ],
                'observable-value-resolve': [
                    'HELLO',
                ],
                'observable-value-update': [
                    'HELLO',
                ],
                finalValue: 'HELLO',
                finalResolvedValue: 'HELLO',
            },
        },
        {
            it: 'handles equality check errors',
            inputs: [
                (instance) => {
                    instance.update('hello');
                    instance.update('hello');
                },
                {
                    equalityCheck() {
                        throw new Error('equality check error');
                    },
                    updateCallback(param: string) {
                        return param.toUpperCase();
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                ],
                'observable-params-update': [
                    'hello',
                ],
                'observable-value-error': [
                    'Error: equality check error',
                ],
                'observable-value-resolve': [
                    'HELLO',
                ],
                'observable-value-update': [
                    'HELLO',
                    'Error: equality check error',
                ],
                finalValue: 'Error: equality check error',
                /**
                 * The first update succeeds because `equalityCheck` isn't called to compare the new
                 * value when there is no previous value.
                 */
                finalResolvedValue: 'HELLO',
            },
        },
        {
            it: 'uses default params',
            inputs: [
                (instance) => {
                    instance.forceUpdate();
                },
                {
                    defaultParams: 'hello',
                    updateCallback(param: string) {
                        return param.toUpperCase();
                    },
                },
            ],
            expect: {
                'observable-callback-call': [
                    'fired',
                ],
                'observable-value-resolve': [
                    'HELLO',
                ],
                'observable-value-update': [
                    'HELLO',
                ],
                finalValue: 'HELLO',
                finalResolvedValue: 'HELLO',
            },
        },
    ]);

    it('ignores ongoing callbacks if setValue is called', async () => {
        let resolved = false;
        const updateDuration = {milliseconds: 500};

        const instance = new CallbackObservable({
            async updateCallback() {
                await wait(updateDuration);
                setTimeout(() => {
                    resolved = true;
                });
                return 5;
            },
        });
        instance.update();

        assert.instanceOf(instance.value, Promise);

        instance.setValue(42);

        assert.isFalse(resolved);
        await waitUntil.isTruthy(() => resolved);
        await wait({milliseconds: updateDuration.milliseconds * 2});
        assert.strictEquals(instance.value as unknown, 42);
    });

    it('ignores function properties', () => {
        let counter = 0;

        const instance = new CallbackObservable({
            updateCallback(params: any) {
                return ++counter;
            },
        });

        instance.update({
            a: 0,
            b: () => {},
        });

        assert.strictEquals(counter, 1);
        assert.strictEquals(instance.value, 1);

        instance.update({
            a: 0,
            b: () => {},
        });

        assert.strictEquals(counter, 1);
        assert.strictEquals(instance.value, 1);
    });

    it('forces an update from forceUpdate', () => {
        const instance = new CallbackObservable({
            updateCallback(input: string) {
                return randomString();
            },
        });
        instance.update('hi');
        const preForceValue = instance.value;
        // does not update with the same input
        instance.update('hi');
        assert.strictEquals(instance.value, preForceValue);
        assert.isString(preForceValue);
        instance.forceUpdate();
        assert.notStrictEquals(instance.value, preForceValue);
    });

    it('has proper types with noUpdate', () => {
        const instance = new CallbackObservable({
            updateCallback(): string | typeof noUpdate {
                return noUpdate;
            },
        });

        assert.tsType(instance.lastResolvedValue).equals<string | undefined>();
        assert.tsType(instance.value).equals<AsyncValue<string>>();
    });
});
