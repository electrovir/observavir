import {assert, check} from '@augment-vir/assert';
import {DeferredPromise, type MaybePromise, wrapPromiseInTimeout} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {AsyncObservable, type AsyncObservableInit, type AsyncValue} from './async-observable.js';
import {noUpdate} from './no-update.js';
import {
    ObservableDestroyEvent,
    ObservableValueErrorEvent,
    ObservableValueResolveEvent,
    ObservableValueUpdateEvent,
} from './observable-events.js';

describe(AsyncObservable.name, () => {
    async function testAsyncObservable(
        callback: (instance: AsyncObservable<any>) => MaybePromise<void>,
        initValue?: AsyncObservableInit<any>,
    ) {
        const events = {
            rejected: [] as string[],
            resolved: [] as any[],
            valueUpdate: [] as string[],
            destroyed: [] as true[],
            equalityChecks: [] as [any, any][],
        };

        const instance = new AsyncObservable({
            equalityCheck(a, b) {
                events.equalityChecks.push([
                    a,
                    b,
                ]);
                return check.strictEquals(a, b);
            },
            ...initValue,
        });

        instance.listenToEvent(ObservableValueErrorEvent, (event) => {
            events.rejected.push(event.detail.message);
        });
        instance.listenToEvent(ObservableValueResolveEvent, (event) => {
            events.resolved.push(event.detail);
        });
        instance.listenToEvent(ObservableValueUpdateEvent, (event) => {
            events.valueUpdate.push(String(event.detail[0]));
        });
        instance.listenToEvent(ObservableDestroyEvent, () => {
            events.destroyed.push(true);
        });

        await callback(instance);

        return events;
    }

    itCases(testAsyncObservable, [
        {
            it: 'emits a destroyed event',
            inputs: [
                (instance) => {
                    instance.destroy();
                },
            ],
            expect: {
                rejected: [],
                resolved: [],
                valueUpdate: [],
                destroyed: [true],
                equalityChecks: [],
            },
        },
        {
            it: "ignores overwritten promise's rejection",
            inputs: [
                (instance) => {
                    assert.isUndefined(instance.lastResolvedValue);
                    const deferredPromise1 = new DeferredPromise<void>();
                    instance.setValue(deferredPromise1.promise);
                    assert.isUndefined(instance.lastResolvedValue);
                    const deferredPromise2 = new DeferredPromise<void>();
                    instance.setValue(deferredPromise2.promise);
                    assert.isUndefined(instance.lastResolvedValue);
                    deferredPromise2.resolve();
                    deferredPromise1.reject();
                },
            ],
            expect: {
                rejected: [],
                resolved: [null],
                valueUpdate: [
                    'undefined',
                ],
                destroyed: [],
                equalityChecks: [],
            },
        },
        {
            it: "ignores overwritten promise's resolution",
            inputs: [
                async (instance) => {
                    const waitingForFirstValue = instance.value;
                    assert.instanceOf(waitingForFirstValue, Promise);
                    const deferredPromise1 = new DeferredPromise<void>();
                    instance.setValue(deferredPromise1.promise);
                    const deferredPromise2 = new DeferredPromise<void>();
                    instance.setValue(deferredPromise2.promise);
                    deferredPromise2.resolve();
                    deferredPromise1.resolve();
                    assert.looseEquals(await waitingForFirstValue, undefined);
                    assert.looseEquals(instance.lastResolvedValue, undefined);
                },
            ],
            expect: {
                rejected: [],
                resolved: [null],
                valueUpdate: [
                    'undefined',
                ],
                destroyed: [],
                equalityChecks: [],
            },
        },
        {
            it: 'sets a resolved value',
            inputs: [
                async (instance) => {
                    const waitingForFirstValue = instance.value;
                    assert.instanceOf(waitingForFirstValue, Promise);
                    instance.setValue('hello there');
                    assert.strictEquals(await waitingForFirstValue, 'hello there');
                    assert.strictEquals(instance.lastResolvedValue, 'hello there');
                },
            ],
            expect: {
                rejected: [],
                resolved: ['hello there'],
                valueUpdate: ['hello there'],
                destroyed: [],
                equalityChecks: [],
            },
        },
        {
            it: 'does not dispatch value update on first promise',
            inputs: [
                async (instance) => {
                    const waitingForFirstValue = instance.value;
                    assert.instanceOf(waitingForFirstValue, Promise);
                    const deferredWrapper = new DeferredPromise<string>();
                    instance.setValue(deferredWrapper.promise);
                    deferredWrapper.resolve('hello there');
                    assert.strictEquals(await waitingForFirstValue, 'hello there');
                    assert.strictEquals(instance.lastResolvedValue, 'hello there');
                },
            ],
            expect: {
                rejected: [],
                resolved: ['hello there'],
                valueUpdate: ['hello there'],
                destroyed: [],
                equalityChecks: [],
            },
        },
        {
            it: 'dispatches value update on later promises',
            inputs: [
                async (instance) => {
                    const initialValuePromise = instance.value;
                    assert.instanceOf(initialValuePromise, Promise);
                    instance.setValue('first value');
                    assert.strictEquals(
                        await wrapPromiseInTimeout({milliseconds: 100}, initialValuePromise),
                        'first value',
                    );
                    const deferredWrapper = new DeferredPromise<string>();
                    instance.setValue(deferredWrapper.promise);

                    deferredWrapper.resolve('second value');
                },
            ],
            expect: {
                rejected: [],
                resolved: [
                    'first value',
                    'second value',
                ],
                valueUpdate: [
                    'first value',
                    '[object Promise]',
                    'second value',
                ],
                destroyed: [],
                equalityChecks: [],
            },
        },
        {
            it: 'resolves the initial promise when setting a promise',
            inputs: [
                async (instance) => {
                    const initialValuePromise = instance.value;
                    assert.instanceOf(initialValuePromise, Promise);
                    const deferredWrapper = new DeferredPromise<string>();
                    instance.setValue(deferredWrapper.promise);

                    deferredWrapper.resolve('here is a value');
                    assert.strictEquals(
                        await wrapPromiseInTimeout({milliseconds: 100}, initialValuePromise),
                        'here is a value',
                    );
                },
            ],
            expect: {
                rejected: [],
                resolved: [
                    'here is a value',
                ],
                valueUpdate: [
                    'here is a value',
                ],
                destroyed: [],
                equalityChecks: [],
            },
        },
        {
            it: 'handles promise rejection',
            inputs: [
                async (instance) => {
                    const initialValuePromise = instance.value;
                    assert.instanceOf(initialValuePromise, Promise);
                    const deferredWrapper = new DeferredPromise<string>();
                    instance.setValue(deferredWrapper.promise);

                    deferredWrapper.reject('FAILURE');

                    await assert.throws(() =>
                        wrapPromiseInTimeout({milliseconds: 100}, initialValuePromise),
                    );
                },
            ],
            expect: {
                rejected: ['FAILURE'],
                resolved: [],
                valueUpdate: [
                    'Error: FAILURE',
                ],
                destroyed: [],
                equalityChecks: [],
            },
        },
        {
            it: 'checks for equality on resolved values',
            inputs: [
                (instance) => {
                    instance.setValue('hello there');
                    instance.setValue('hello there');
                    instance.setValue('another value');
                },
            ],
            expect: {
                rejected: [],
                resolved: [
                    'hello there',
                    'another value',
                ],
                valueUpdate: [
                    'hello there',
                    'another value',
                ],
                destroyed: [],
                equalityChecks: [
                    [
                        'hello there',
                        'hello there',
                    ],
                    [
                        'hello there',
                        'another value',
                    ],
                ],
            },
        },
        {
            it: 'does not set the same promise',
            inputs: [
                (instance) => {
                    instance.setValue('first value');
                    const deferredWrapper = new DeferredPromise<string>();
                    instance.setValue(deferredWrapper.promise);
                    instance.setValue(deferredWrapper.promise);
                    instance.setValue(deferredWrapper.promise);
                    instance.setValue(deferredWrapper.promise);
                    instance.setValue(deferredWrapper.promise);

                    deferredWrapper.resolve('done');
                },
            ],
            expect: {
                rejected: [],
                resolved: [
                    'first value',
                    'done',
                ],
                valueUpdate: [
                    'first value',
                    '[object Promise]',
                    'done',
                ],
                destroyed: [],
                equalityChecks: [],
            },
        },
        {
            it: 'sets an initial value',
            inputs: [
                (instance) => {
                    assert.strictEquals(instance.value, 'init value');
                    assert.strictEquals(instance.lastResolvedValue, 'init value' as string);
                    instance.setValue('second value');
                    assert.strictEquals(instance.lastResolvedValue, 'second value');
                    const deferredWrapper = new DeferredPromise<string>();
                    instance.setValue(deferredWrapper.promise);

                    deferredWrapper.resolve('third value');
                },
                {
                    defaultValue: 'init value',
                },
            ],
            expect: {
                rejected: [],
                resolved: [
                    'second value',
                    'third value',
                ],
                valueUpdate: [
                    'second value',
                    '[object Promise]',
                    'third value',
                ],
                destroyed: [],
                equalityChecks: [
                    [
                        'init value',
                        'second value',
                    ],
                ],
            },
        },
        {
            it: 'handles equalityCheck errors',
            inputs: [
                (instance) => {
                    instance.setValue('second value');
                },
                {
                    defaultValue: 'init value',
                    equalityCheck() {
                        throw new Error('equality check error');
                    },
                },
            ],
            expect: {
                rejected: [
                    'equality check error',
                ],
                resolved: [],
                valueUpdate: [
                    'Error: equality check error',
                ],
                destroyed: [],
                equalityChecks: [],
            },
        },
    ]);

    it('ignores noUpdate inside a promise', async () => {
        const instance = new AsyncObservable<string>();

        const valueUpdates: string[] = [];

        instance.listen(false, (newValue) => {
            valueUpdates.push(newValue);
        });

        instance.setValue('hi');
        instance.setValue(noUpdate);
        instance.setValue('hi2');
        instance.setValue(Promise.resolve(noUpdate));
        await instance.value;
        instance.setValue('hi3');

        assert.deepEquals(valueUpdates.slice(0, 2), [
            'hi',
            'hi2',
        ]);
        assert.instanceOf(valueUpdates[2], Promise);
        assert.deepEquals(valueUpdates.slice(3), [
            'hi2',
            'hi3',
        ]);
        assert.isLengthExactly(valueUpdates, 5);

        /**
         * Output should look like this:
         *
         * ```ts
         * const valueUpdates = [
         *     'hi',
         *     'hi2',
         *     <Promise>,
         *     'hi2',
         *     'hi3',
         * ];
         * ```
         */
    });

    it('defaults to strict equal', () => {
        const instance = new AsyncObservable<string>();

        const valueUpdates: string[] = [];

        instance.listen(false, (newValue) => {
            valueUpdates.push(newValue);
        });

        instance.setValue('hi');
        instance.setValue('hi');

        assert.deepEquals(valueUpdates, ['hi']);
    });

    it('supports custom equality checking', () => {
        const instance = new AsyncObservable<string>({
            equalityCheck() {
                return false;
            },
        });

        const valueUpdates: string[] = [];

        instance.listen(false, (newValue) => {
            valueUpdates.push(newValue);
        });

        instance.setValue('hi');
        instance.setValue('hi');
        instance.setValue('hi');

        assert.deepEquals(valueUpdates, [
            'hi',
            'hi',
            'hi',
        ]);
    });

    it('has proper types', () => {
        const instance = new AsyncObservable({
            defaultValue: 'hello',
            equalityCheck(a, b) {
                assert.tsType(a).equals<string>();
                assert.tsType(b).equals<string>();

                return a === b;
            },
        });

        assert.tsType(instance.value).equals<AsyncValue<string>>();
        assert.tsType(instance.lastResolvedValue).equals<string | undefined>();

        instance.setValue('hi');
        // @ts-expect-error input wrong type
        instance.setValue(32);
        // can be a promise of the value
        instance.setValue(Promise.resolve('hi'));
        // @ts-expect-error input wrong type
        instance.setValue(Promise.resolve(32));

        instance.listen(false, (value) => {
            assert.tsType(value).equals<string>();
        });

        instance.listenToEvent(ObservableValueResolveEvent, (event) => {
            assert.tsType(event.detail).equals<unknown>();
        });
    });
});
