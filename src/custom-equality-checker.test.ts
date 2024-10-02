import {describe, itCases} from '@augment-vir/test';
import {observableEqualityCheck} from './custom-equality-checker.js';

describe(observableEqualityCheck.name, () => {
    itCases(observableEqualityCheck, [
        {
            it: 'passes with object entry equality',
            inputs: [
                {a: 'a'},
                {a: 'a'},
            ],
            expect: true,
        },
        {
            it: 'rejects with object entry inequality',
            inputs: [
                {a: 'a'},
                {a: 'b'},
            ],
            expect: false,
        },
        {
            it: 'fails a function compared to an object',
            inputs: [
                () => {},
                {a: 'a'},
            ],
            expect: false,
        },
        {
            it: 'fails a string compared to an object',
            inputs: [
                'a',
                {a: 'a'},
            ],
            expect: false,
        },
        {
            it: 'passes with strict equality',
            inputs: [
                'a',
                'a',
            ],
            expect: true,
        },
        {
            it: 'rejects with strict equality',
            inputs: [
                'a',
                'b',
            ],
            expect: false,
        },
    ]);
});
