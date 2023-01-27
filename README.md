# quick-tap

User-land NodeJS and TAP compatible test harness. Implements Node's testing API.

Features:

- [TAP](https://testanything.org/) formatted output
- Works in [QuickJS](https://bellard.org/quickjs/)
- Zero dependencies

Quick-Tap defers from Node's testing module in the following ways:

- `test.skip()` is added which is currently missing in Node 19.5.0 as of writing
- `test.todo()` is added which is currently missing in Node 19.5.0 as of writing
- The whole harness runs in the same process and does not do any process forking
- There's no test runner, you simply run the test file directly by executing it
- Mocking and Assertions are not included. You can use Sinon and Chai for that
- There is no concurrency option. Tests are run asynchronously.
- `AbortSignal` is not available. Use `test.bailout()` instead.

By default the library writes to `stdout` with `console.log` calls, but you can
override this behavior by passing a custom `reporter` function where applicable.
