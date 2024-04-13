import {itCases} from '@augment-vir/browser-testing';
import {
    MaybePromise,
    createDeferredPromiseWrapper,
    wrapPromiseInTimeout,
} from '@augment-vir/common';
import {assert} from '@open-wc/testing';
import {
    assertInstanceOf,
    assertLooseEqual,
    assertStrictEqual,
    assertThrows,
    assertTypeOf,
    isStrictEqual,
} from 'run-time-assertions';
import {AsyncObservable, AsyncObservableInit, AsyncValue} from './async-observable';
import {
    ObservableDestroyEvent,
    ObservableValueErrorEvent,
    ObservableValueResolveEvent,
    ObservableValueUpdateEvent,
} from './observable-events';

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
                return isStrictEqual(a, b);
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
            events.valueUpdate.push(String(event.detail));
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
                    const deferredPromise1 = createDeferredPromiseWrapper<void>();
                    instance.setValue(deferredPromise1.promise);
                    assert.isUndefined(instance.lastResolvedValue);
                    const deferredPromise2 = createDeferredPromiseWrapper<void>();
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
                    'null',
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
                    assertInstanceOf(waitingForFirstValue, Promise);
                    const deferredPromise1 = createDeferredPromiseWrapper<void>();
                    instance.setValue(deferredPromise1.promise);
                    const deferredPromise2 = createDeferredPromiseWrapper<void>();
                    instance.setValue(deferredPromise2.promise);
                    deferredPromise2.resolve();
                    deferredPromise1.resolve();
                    assertLooseEqual(await waitingForFirstValue, undefined);
                    assertLooseEqual(instance.lastResolvedValue, undefined);
                },
            ],
            expect: {
                rejected: [],
                resolved: [null],
                valueUpdate: [
                    'null',
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
                    assertInstanceOf(waitingForFirstValue, Promise);
                    instance.setValue('hello there');
                    assertStrictEqual(await waitingForFirstValue, 'hello there');
                    assertStrictEqual(instance.lastResolvedValue, 'hello there');
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
                    assertInstanceOf(waitingForFirstValue, Promise);
                    const deferredWrapper = createDeferredPromiseWrapper<string>();
                    instance.setValue(deferredWrapper.promise);
                    deferredWrapper.resolve('hello there');
                    assertStrictEqual(await waitingForFirstValue, 'hello there');
                    assertStrictEqual(instance.lastResolvedValue, 'hello there');
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
                    assertInstanceOf(initialValuePromise, Promise);
                    instance.setValue('first value');
                    assert.strictEqual(
                        await wrapPromiseInTimeout(100, initialValuePromise),
                        'first value',
                    );
                    const deferredWrapper = createDeferredPromiseWrapper<string>();
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
                    assertInstanceOf(initialValuePromise, Promise);
                    const deferredWrapper = createDeferredPromiseWrapper<string>();
                    instance.setValue(deferredWrapper.promise);

                    deferredWrapper.resolve('here is a value');
                    assert.strictEqual(
                        await wrapPromiseInTimeout(100, initialValuePromise),
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
                    assertInstanceOf(initialValuePromise, Promise);
                    const deferredWrapper = createDeferredPromiseWrapper<string>();
                    instance.setValue(deferredWrapper.promise);

                    deferredWrapper.reject('FAILURE');

                    await assertThrows(() => wrapPromiseInTimeout(100, initialValuePromise));
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
                async (instance) => {
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
                async (instance) => {
                    instance.setValue('first value');
                    const deferredWrapper = createDeferredPromiseWrapper<string>();
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
                async (instance) => {
                    assert.strictEqual(instance.value, 'init value');
                    assert.strictEqual(instance.lastResolvedValue, 'init value');
                    instance.setValue('second value');
                    assert.strictEqual(instance.lastResolvedValue, 'second value');
                    const deferredWrapper = createDeferredPromiseWrapper<string>();
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
                async (instance) => {
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

    it('defaults to strict equal', () => {
        const instance = new AsyncObservable<string>();

        const valueUpdates: string[] = [];

        instance.listen(false, (newValue) => {
            valueUpdates.push(newValue);
        });

        instance.setValue('hi');
        instance.setValue('hi');

        assert.deepStrictEqual(valueUpdates, ['hi']);
    });

    it('has proper types', () => {
        const instance = new AsyncObservable({
            defaultValue: 'hello',
            equalityCheck(a, b) {
                assertTypeOf(a).toEqualTypeOf<string>();
                assertTypeOf(b).toEqualTypeOf<string>();

                return a === b;
            },
        });

        assertTypeOf(instance.value).toEqualTypeOf<AsyncValue<string>>();
        assertTypeOf(instance.lastResolvedValue).toEqualTypeOf<string | undefined>();

        instance.setValue('hi');
        // @ts-expect-error input wrong type
        instance.setValue(32);
        // can be a promise of the value
        instance.setValue(Promise.resolve('hi'));
        // @ts-expect-error input wrong type
        instance.setValue(Promise.resolve(32));

        instance.listen(false, (value) => {
            assertTypeOf(value).toEqualTypeOf<string>();
        });

        instance.listenToEvent(ObservableValueResolveEvent, (event) => {
            assertTypeOf(event.detail).toBeUnknown();
        });
    });
});
