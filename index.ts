export class Harness {
	private readonly _suiteStack: string[] = [];
	private readonly _tests = new Set<TestContext.Callable>();
	public describe(name: string, fn: TestContext.Callable) {
		this._suiteStack.push(name);
		fn();
		this._suiteStack.pop();
	}
	public it(name: string, fn: TestContext.Callable) {
		const testId = this._tests.size + 1;
		this._tests.add(async () => {
			let ok = true;
			try {
				await fn();
			} catch (_) {
				ok = false;
			}
			console.log(`${ok ? "ok" : "not ok"} ${testId} ${this._suiteStack.join("/")}/${name}`);
		});
	}
	public test(name: string, fn: TestContext.Testable) {
		const testId = this._tests.size + 1;
		this._tests.add(async () => {
			let ok = true;
			try {
				await fn({
					name,
					test: async (name, fn) => {
						this.test(name, fn);
					},
				});
			} catch (_) {
				ok = false;
			}
			console.log(`${ok ? "ok" : "not ok"} ${testId} ${name}`);
		});
	}
	public async run() {
		console.log("TAP version 14");
		for (const test of this._tests) {
			await test();
		}
	}
}
export interface SuiteContext {
	readonly name: string;
	// // readonly signal: AbortSignal;
}
export interface TestContext {
	readonly name: string;
	// // readonly signal: AbortSignal;
	// // beforeEach(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	// // afterEach(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	// // beforeAll(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	// // afterAll(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	// // before(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	// // after(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	// // diagnostic(message: string): void;
	// // runOnly(shouldRunOnlyTests: boolean): void;
	// // skip(message?: string): void;
	// // todo(message?: string): void;
	// // test(
	// // 	name: string,
	// // 	options: TestContext.TestOptions,
	// // 	fn: (context: TestContext) => void | Promise<void>,
	// // ): Promise<void>;
	test(name: string, fn: (context: TestContext) => void | Promise<void>): Promise<void>;
}
export namespace TestContext {
	export type Testable = (context: TestContext) => any;
	export type Callable = (...input: any) => any;
	export type HookFn = (context: TestContext) => any | Promise<any>;
	export interface HookOptions {
		readonly timeout?: number;
		readonly signal?: AbortSignal;
	}
	export interface TestOptions {
		readonly timeout?: number;
		readonly signal?: AbortSignal;
		readonly skip?: boolean | string;
		readonly todo?: boolean | string;
		readonly only?: boolean;
		readonly concurrency?: number;
	}
}

const harness = new Harness();
const test = harness.test.bind(harness);
const describe = harness.describe.bind(harness);
const it = harness.it.bind(harness);
const run = harness.run.bind(harness);
export { test, describe, it, run };
