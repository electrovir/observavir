import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {isObservableBase} from './observable-base.js';
import {Trigger} from './trigger.js';

describe(Trigger.name, () => {
    it('only returns a triggered value on the first read', () => {
        const instance = new Trigger<string>();

        const values = [
            instance.value,
        ];
        instance.trigger('a');
        values.push(instance.value, instance.value);
        instance.trigger('a');
        values.push(instance.value);

        assert.deepEquals(values, [
            undefined,
            'a',
            undefined,
            'a',
        ]);
    });

    it('fires listeners for repeated values', () => {
        const instance = new Trigger<string>();
        const results: (string | undefined)[] = [];

        instance.listen(false, (newValue) => {
            results.push(newValue);
        });

        instance.trigger('a');
        instance.trigger('a');

        assert.deepEquals(results, [
            'a',
            'a',
        ]);
        assert.strictEquals(instance.value, 'a');
    });

    it('is an observable base', () => {
        const instance = new Trigger<string>();
        instance.trigger('a');

        assert.isTrue(isObservableBase(instance));
        assert.strictEquals(instance.value, 'a');
    });

    it('allows an empty trigger for a void value', () => {
        const instance = new Trigger<void>();
        instance.trigger();

        // @ts-expect-error: a non-void trigger requires a value
        new Trigger<string>().trigger();

        assert.tsType(instance.value).equals<void | undefined>();
    });

    it('consumes the trigger once per trigger call', () => {
        const instance = new Trigger<void>();

        const results = [
            instance.consumeTrigger(),
        ];
        instance.trigger();
        results.push(instance.consumeTrigger(), instance.consumeTrigger());

        assert.deepEquals(results, [
            false,
            true,
            false,
        ]);
    });

    it('shares consumption between value and consumeTrigger', () => {
        const instance = new Trigger<string>();

        instance.trigger('a');
        const consumed = instance.consumeTrigger();

        assert.deepEquals(
            {
                consumed,
                value: instance.value,
            },
            {
                consumed: true,
                value: undefined,
            },
        );
    });

    it('stops firing a removed listener', () => {
        const instance = new Trigger<string>();
        const results: (string | undefined)[] = [];

        function callback(newValue: string | undefined) {
            results.push(newValue);
        }

        instance.listen(false, callback);
        instance.trigger('a');
        const wasRemoved = instance.removeListener(callback);
        instance.trigger('b');

        assert.deepEquals(
            {
                wasRemoved,
                results,
            },
            {
                wasRemoved: true,
                results: [
                    'a',
                ],
            },
        );
    });

    it('stops firing listeners after destroy', () => {
        const instance = new Trigger<string>();
        const results: (string | undefined)[] = [];

        instance.listen(false, (newValue) => {
            results.push(newValue);
        });
        instance.trigger('a');
        instance.destroy();
        instance.trigger('b');

        assert.deepEquals(results, [
            'a',
        ]);
    });
});
