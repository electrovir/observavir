import {itCases} from '@augment-vir/browser-testing';
import {
    MaybePromise,
    createDeferredPromiseWrapper,
    getOrSet,
    randomString,
    wait,
    waitUntilTruthy,
} from '@augment-vir/common';
import {assert} from '@open-wc/testing';
import {
    assertInstanceOf,
    assertRunTimeType,
    assertStrictEqual,
    assertTypeOf,
    isStrictEqual,
} from 'run-time-assertions';
import {AsyncValue} from './async-observable';
import {CallbackObservable, CallbackObservableInit} from './callback-observable';
import {noUpdate} from './no-update';
import {ObservableEventTypes, allObservableEvents} from './observable-events';

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
            assertTypeOf(a).toEqualTypeOf<string | {value1: string; value2: number}>();
            assertTypeOf(b).toEqualTypeOf<string | {value1: string; value2: number}>();
            return isStrictEqual(a, b);
        };

        // @ts-expect-error: update inputs should be the params
        instance.update('hi');
        assertTypeOf(instance.value).toEqualTypeOf<AsyncValue<string>>();
        assert.instanceOf(instance.value, Error);

        instance.update({
            value1: 'hi ',
            value2: 3,
        });

        assert.strictEqual<unknown>(instance.value, 'hi hi hi ');

        /** Can be called without params. */
        instance.forceUpdate();

        instance.setValue('hi');
        assert.strictEqual<unknown>(instance.value, 'hi');
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
                return isStrictEqual(a, b);
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
            throws: 'updateCallback was never set',
        },
        {
            it: 'errors on updateTrigger without updateCallback',
            inputs: [
                (instance) => {
                    instance.update('something');
                },
            ],
            throws: 'updateCallback was never set',
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
            throws: 'params were never set',
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
                    assert.strictEqual(instance.lastParams, 'hi');
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
                    const deferred = createDeferredPromiseWrapper<string>();
                    instance.update(deferred.promise);

                    assertInstanceOf(instance.value, Promise);
                    assertStrictEqual(instance.lastResolvedValue, 'init');

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
                async (instance) => {
                    instance.update('hi');
                },
                {
                    defaultValue: 'init',
                    updateCallback(param: string) {
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
                async (instance) => {
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
            it: 'defaults ti isLooseEqual',
            inputs: [
                async (instance) => {
                    instance.update('hello');
                    instance.update('hello');
                },
                {
                    equalityCheck: undefined,
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
                async (instance) => {
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
                async (instance) => {
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
                await wait(updateDuration.milliseconds);
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
        await waitUntilTruthy(() => resolved);
        await wait(updateDuration.milliseconds * 2);
        assert.strictEqual<unknown>(instance.value, 42);
    });

    it('forces an update from forceUpdate', async () => {
        const instance = new CallbackObservable({
            updateCallback(input: string) {
                return randomString();
            },
        });
        instance.update('hi');
        const preForceValue = instance.value;
        // does not update with the same input
        instance.update('hi');
        assert.strictEqual(instance.value, preForceValue);
        assertRunTimeType(preForceValue, 'string');
        instance.forceUpdate();
        assert.notStrictEqual(instance.value, preForceValue);
    });

    it('has proper types with noUpdate', async () => {
        const instance = new CallbackObservable({
            updateCallback(): string | typeof noUpdate {
                return noUpdate;
            },
        });

        assertTypeOf(instance.lastResolvedValue).toEqualTypeOf<string | undefined>();
        assertTypeOf(instance.value).toEqualTypeOf<AsyncValue<string>>();
    });
});
