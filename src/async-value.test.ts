import {assert} from '@augment-vir/assert';
import {describe, it, itCases} from '@augment-vir/test';
import {
    type AsyncValue,
    isAsyncValueResolved,
    mapAsyncValue,
    resolvedAsyncValue,
} from './async-value.js';
import {noUpdate} from './no-update.js';

describe(mapAsyncValue.name, () => {
    it('preserves error', () => {
        const asyncValue = new Error('fake error') as AsyncValue<string>;

        const mappedValue = mapAsyncValue(asyncValue, (value) => {
            assert.tsType(value).equals<string>();
            return Number(value);
        });

        assert.tsType(mappedValue).equals<AsyncValue<number>>();
        assert.strictEquals<any, any>(mappedValue, asyncValue);
        assert.instanceOf(mappedValue, Error);
    });
    it('preserves promise', async () => {
        const asyncValue = Promise.resolve('42') as AsyncValue<string>;

        const mappedValue = mapAsyncValue(asyncValue, (value) => {
            assert.tsType(value).equals<string>();
            return Number(value);
        });

        assert.tsType(mappedValue).equals<AsyncValue<number>>();
        assert.instanceOf(mappedValue, Promise);
        assert.strictEquals(await mappedValue, 42);
        assert.strictEquals(await asyncValue, '42');
    });
    it('maps a resolved value', () => {
        const asyncValue = '5' as AsyncValue<string>;

        const mappedValue = mapAsyncValue(asyncValue, (value) => {
            assert.tsType(value).equals<string>();
            return Number(value);
        });

        assert.tsType(mappedValue).equals<AsyncValue<number>>();
        assert.strictEquals(mappedValue, 5);
    });
    it('errors on no update', async () => {
        let callCount = 0;

        assert.throws(() =>
            mapAsyncValue(undefined, () => {
                ++callCount;
                return noUpdate;
            }),
        );
        assert.throws(() =>
            mapAsyncValue(Promise.resolve({}), () => {
                ++callCount;
                return noUpdate;
            }),
        );
        await mapAsyncValue({}, () => {
            ++callCount;
            return undefined;
        });
        assert.strictEquals(callCount, 3);
    });
});

describe(isAsyncValueResolved.name, () => {
    it('type guards', () => {
        const asyncValue = new Error('fake error') as AsyncValue<number>;

        if (isAsyncValueResolved(asyncValue)) {
            assert.tsType(asyncValue).equals<number>();
        } else {
            assert.tsType(asyncValue).equals<Promise<number> | Error>();
        }
        assert.isFalse(isAsyncValueResolved(asyncValue));
    });

    itCases(isAsyncValueResolved, [
        {
            it: 'accepts a resolved value',
            input: 4,
            expect: true,
        },
        {
            it: 'rejects a promise',
            input: Promise.resolve(3),
            expect: false,
        },
        {
            it: 'rejects an Error',
            input: new Error('2'),
            expect: false,
        },
    ]);
});

describe(resolvedAsyncValue.name, () => {
    it('type guards', () => {
        const asyncValue = new Error('fake error') as AsyncValue<number>;

        assert.tsType(resolvedAsyncValue(asyncValue)).equals<number | undefined>();

        assert.isUndefined(resolvedAsyncValue(asyncValue));
    });

    itCases(resolvedAsyncValue, [
        {
            it: 'accepts a resolved value',
            input: 4,
            expect: 4,
        },
        {
            it: 'rejects a promise',
            input: Promise.resolve(3),
            expect: undefined,
        },
        {
            it: 'rejects an Error',
            input: new Error('2'),
            expect: undefined,
        },
    ]);
});
