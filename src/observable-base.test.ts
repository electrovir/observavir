import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {GenericListenTarget} from 'typed-event-target';
import {isObservableBase, observableBaseShape, observableMarker} from './observable-base.js';
import {Observable} from './observable.js';
import {Trigger} from './trigger.js';

describe(isObservableBase.name, () => {
    it('accepts an observable instance', () => {
        assert.isTrue(
            isObservableBase(
                new Observable({
                    defaultValue: 'yo',
                }),
            ),
        );
    });

    it('accepts a trigger instance', () => {
        assert.isTrue(isObservableBase(new Trigger<string>()));
    });

    it('rejects objects with observable methods but no marker', () => {
        assert.isFalse(isObservableBase(new GenericListenTarget()));
    });

    it('rejects marked objects missing observable methods', () => {
        assert.isFalse(
            isObservableBase({
                [observableMarker]: true,
            }),
        );
    });
});

describe('minimalObservableShape', () => {
    it('has actual functions for defaults', () => {
        assert.doesNotThrow(() => observableBaseShape.default.removeListener(() => {}));
        assert.doesNotThrow(() => observableBaseShape.default.listen(false, () => {}));
        assert.doesNotThrow(() => observableBaseShape.default.destroy());
    });
});
