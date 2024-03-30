import {assert} from '@open-wc/testing';
import {Observable} from './observable';
import {isObservableBase, observableBaseShape} from './observable-base';

describe(isObservableBase.name, () => {
    it('accepts an observable instance', () => {
        assert.isTrue(isObservableBase(new Observable({defaultValue: 'yo'})));
    });
});

describe('minimalObservableShape', () => {
    it('has actual functions for defaults', () => {
        observableBaseShape.defaultValue.removeListener(() => {});
        observableBaseShape.defaultValue.listen(() => {});
        observableBaseShape.defaultValue.destroy();
    });
});
