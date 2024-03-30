# observavir

Flexible and simple observables with multiple implementations.

Supports CJS and ESM import.

## install

```sh
npm i observavir
```

## usage

Full docs: https://electrovir.github.io/observavir

All observables have a `.value` property for accessing the current value and a `.listen()` method for attaching callbacks to value updates.

Several different observable classes are exported from this package:

-   [`Observable`](https://electrovir.github.io/observavir/classes/Observable.html): Bare bones basic observable. Can be listened to and its value can be updated with `.setValue()`.
-   [`AsyncObservable`](https://electrovir.github.io/observavir/classes/AsyncObservable.html): If given a Promise, it will update `value` (and listeners) when the Promise is set and then resolved or rejected so you can track and even `await` the Promises. Also includes a `lastResolvedValue` for anything that does't care about the Promise lifecycle.
-   [`CallbackObservable`](https://electrovir.github.io/observavir/classes/CallbackObservable.html): A sub-class of `AsyncObservable` that accepts a callback for triggering updates of `value`.
-   [`IntervalObservable`](https://electrovir.github.io/observavir/classes/IntervalObservable.html): A sub-class of `CallbackObservable` that will automatically update itself at a give internal rate.
