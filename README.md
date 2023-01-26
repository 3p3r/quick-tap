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
- If the test function receives a callback function and also returns a Promise,
  the test __will not fail__. Except, it will fail iff the callback receives any
  truthy value as its first argument __or__ if the Promise rejects.

By default the library writes to `stdout` with `console.log` calls, but you can
override this behavior by passing a custom `reporter` function where applicable.
