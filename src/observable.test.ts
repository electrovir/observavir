import {assert} from '@open-wc/testing';
import {assertTypeOf, isLooseEqual} from 'run-time-assertions';
import {noUpdate} from './no-update';
import {Observable} from './observable';

describe(Observable.name, () => {
    it('calls listen when value updates', () => {
        const results: string[] = [];

        const instance = new Observable({defaultValue: 'hi'});

        instance.listen((newValue) => {
            results.push(newValue);
        });

        instance.setValue('hi');
        instance.setValue('different string');
        instance.setValue('hi');

        assert.deepStrictEqual(results, [
            'different string',
            'hi',
        ]);
    });

    it('removes the listener with callback', () => {
        const results: string[] = [];

        const instance = new Observable({defaultValue: 'hi'});

        const removeListener = instance.listen((newValue) => {
            results.push(newValue);
        });

        instance.setValue('different string');

        removeListener();

        instance.setValue('hi');

        assert.deepStrictEqual(results, [
            'different string',
        ]);
    });

    it('removes the listener with class method', () => {
        const results: string[] = [];

        const instance = new Observable({defaultValue: 'hi'});

        const callback = (newValue: string) => {
            results.push(newValue);
        };

        instance.listen(callback);

        instance.setValue('different string');

        instance.removeListener(callback);

        instance.setValue('hi');

        assert.deepStrictEqual(results, [
            'different string',
        ]);
    });

    it('does not update if the value is noUpdate', () => {
        const instance = new Observable({defaultValue: 'hi'});

        instance.setValue(noUpdate);
        assert.strictEqual(instance.value, 'hi');
    });

    it('supports different equality checks', () => {
        const results: string[] = [];

        const instance = new Observable({defaultValue: '5', equalityCheck: isLooseEqual});

        instance.listen((newValue: string) => {
            results.push(newValue);
        });

        instance.setValue(5 as unknown as string);
        instance.setValue(42 as unknown as string);

        instance.setValue('hi');

        assert.deepStrictEqual(results, [
            42,
            'hi',
        ]);
    });

    it('has proper types', () => {
        const instance = new Observable({defaultValue: 'hi', equalityCheck: isLooseEqual});

        instance.setValue('different string');
        // @ts-expect-error: wrong value type
        instance.setValue(42);

        // @ts-expect-error: wrong type for equality check callback
        new Observable({defaultValue: 'hi', equalityCheck: (a: number, b: number) => true});

        instance.listen((value) => {
            assertTypeOf(value).toEqualTypeOf<string>();
        });
    });
});
