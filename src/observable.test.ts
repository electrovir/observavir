import {assert, check} from '@augment-vir/assert';
import {randomString} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {noUpdate} from './no-update.js';
import {Observable} from './observable.js';

describe(Observable.name, () => {
    it('calls listen when value updates', () => {
        const results: string[] = [];

        const instance = new Observable({
            defaultValue: 'hi',
        });

        instance.listen(false, (newValue) => {
            results.push(newValue);
        });

        instance.setValue('hi');
        instance.setValue('different string');
        instance.setValue('hi');

        assert.deepEquals(results, [
            'different string',
            'hi',
        ]);
    });

    it('removes the listener with callback', () => {
        const results: string[] = [];

        const instance = new Observable({
            defaultValue: 'hi',
        });

        const removeListener = instance.listen(false, (newValue) => {
            results.push(newValue);
        });

        instance.setValue('different string');

        removeListener();

        instance.setValue('hi');

        assert.deepEquals(results, [
            'different string',
        ]);
    });

    it('removes the listener with class method', () => {
        const results: string[] = [];

        const instance = new Observable({
            defaultValue: 'hi',
        });

        const callback = (newValue: string) => {
            results.push(newValue);
        };

        instance.listen(false, callback);

        instance.setValue('different string');

        instance.removeListener(callback);

        instance.setValue('hi');

        assert.deepEquals(results, [
            'different string',
        ]);
    });

    it('does not update if the value is noUpdate', () => {
        const instance = new Observable({
            defaultValue: 'hi',
        });

        instance.setValue(noUpdate);
        assert.strictEquals(instance.value, 'hi');
    });

    it('supports different equality checks', () => {
        const results: string[] = [];

        const instance = new Observable({
            defaultValue: '5',
            equalityCheck: check.looseEquals,
        });

        instance.listen(false, (newValue: string) => {
            results.push(newValue);
        });

        instance.setValue(5 as unknown as string);
        instance.setValue(42 as unknown as string);

        instance.setValue('hi');

        assert.deepEquals(results as unknown[], [
            42,
            'hi',
        ]);
    });

    it('fires with new and old values', () => {
        const results: {newValue: string; oldValue: string | undefined}[] = [];

        const instance = new Observable({
            defaultValue: '5',
            equalityCheck: check.looseEquals,
        });

        instance.listen(false, (newValue, oldValue) => {
            results.push({
                newValue,
                oldValue,
            });
        });

        instance.setValue(5 as unknown as string);
        instance.setValue(42 as unknown as string);

        instance.setValue('hi');

        assert.deepEquals(results as unknown[], [
            {
                newValue: 42,
                oldValue: '5',
            },
            {
                newValue: 'hi',
                oldValue: 42,
            },
        ]);
    });

    it('old values are undefined on initial fire', () => {
        const results: {newValue: string; oldValue: string | undefined}[] = [];

        const instance = new Observable({
            defaultValue: '5',
            equalityCheck: check.looseEquals,
        });

        instance.listen(true, (newValue, oldValue) => {
            results.push({
                newValue,
                oldValue,
            });
        });

        instance.setValue(5 as unknown as string);
        instance.setValue(42 as unknown as string);

        instance.setValue('hi');

        assert.deepEquals(results as unknown[], [
            {
                newValue: '5',
                oldValue: undefined,
            },
            {
                newValue: 42,
                oldValue: '5',
            },
            {
                newValue: 'hi',
                oldValue: 42,
            },
        ]);
    });

    it('has proper types', () => {
        const instance = new Observable({
            defaultValue: 'hi',
            equalityCheck: check.looseEquals,
        });

        instance.setValue('different string');
        // @ts-expect-error: wrong value type
        instance.setValue(42);

        // eslint-disable-next-line sonarjs/constructor-for-side-effects
        new Observable({
            defaultValue: 'hi',
            // @ts-expect-error: wrong type for equality check callback
            equalityCheck: ({a, b}: Readonly<{a: number; b: number}>) => true,
        });

        instance.listen(false, (value) => {
            assert.tsType(value).equals<string>();
        });
    });

    it('fires a listener immediately', () => {
        const results: string[] = [];

        const defaultValue = randomString();
        const instance = new Observable({
            defaultValue,
        });

        instance.listen(true, (value) => {
            results.push(value);
        });

        assert.deepEquals(results, [defaultValue]);
        assert.strictEquals(instance.getListenerCount(), 1);
    });

    it('sets values and fires listeners on every setValue call when equalityCheck is undefined', () => {
        const results: string[] = [];

        const instance = new Observable({
            defaultValue: 'hi',
            equalityCheck: undefined,
        });

        instance.listen(false, (newValue) => {
            results.push(newValue);
        });

        instance.setValue('hi');
        instance.setValue('hi');
        instance.setValue('hi');

        assert.deepEquals(results, [
            'hi',
            'hi',
            'hi',
        ]);
    });
});
