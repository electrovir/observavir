import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {isObservableBase, observableBaseShape} from './observable-base.js';
import {Observable} from './observable.js';

describe(isObservableBase.name, () => {
    it('accepts an observable instance', () => {
        assert.isTrue(isObservableBase(new Observable({defaultValue: 'yo'})));
    });
});

describe('minimalObservableShape', () => {
    it('has actual functions for defaults', () => {
        observableBaseShape.defaultValue.removeListener(() => {});
        observableBaseShape.defaultValue.listen(false, () => {});
        observableBaseShape.defaultValue.destroy();
    });
});
