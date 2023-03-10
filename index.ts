// This is an implementation of the TAP protocol version 14 in TypeScript.
// Specification: https://testanything.org/tap-version-14-specification.html
// Terminology follows the TAP nomenclature, and aims to stay dependency-free.

// tiny assert implementation ッ
function ッ<T = boolean>(cond: T, msg?: string) {
	if (!cond) {
		throw new Error(msg);
	}
}

namespace formalize {
	export const EmptyString = "";
	export const Indentation = "  ";
	export function description(text: string) {
		return text.startsWith(" - ") ? text : ` - ${text}`;
	}
	export function escape(text: string) {
		return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	}
}
export enum Directive {
	Skip,
	Todo,
}
export enum Status {
	Ok,
	NotOk,
}
enum Block {
	It,
	Test,
	Describe,
	Default,
}
export interface TestPlanConfiguration {
	readonly timeout?: number;
	readonly skip?: boolean | string;
	readonly todo?: boolean | string;
	readonly only?: boolean;
}
export namespace TestPlanConfiguration {
	export const Default: TestPlanConfiguration = {
		timeout: Infinity,
		skip: false,
		todo: false,
		only: false,
	};
}
export interface TestPointInitializer extends TestPlanConfiguration {
	readonly fn?: Fn;
	readonly name?: string;
	readonly block: Block;
	readonly scope?: TestPoint;
	readonly directive?: Directive;
}
export interface TestRunConfiguration {
	readonly timeout?: number;
}
export namespace TestRunConfiguration {
	export const Default: TestRunConfiguration = {
		timeout: Infinity,
	};
}
export interface PlanTestWithDirective<T> {
	(this: TestPoint, name: string, options: TestPlanConfiguration, fn: T): void;
	skip(this: TestPoint, name: string, options: TestPlanConfiguration, fn: T): void;
	todo(this: TestPoint, name: string, options: TestPlanConfiguration, fn: T): void;
	(this: TestPoint, name: string, fn: T): void;
	skip(this: TestPoint, name: string, fn: T): void;
	todo(this: TestPoint, name: string, fn: T): void;
}
export interface Hookable {
	beforeEach(fn: Hook, options?: HookOptions): void;
	afterEach(fn: Hook, options?: HookOptions): void;
	before(fn: Hook, options?: HookOptions): void;
	after(fn: Hook, options?: HookOptions): void;
}

// internal to the library, not exported
const IT = Symbol("QuickTap/TestPoint/it");
const TEST = Symbol("QuickTap/TestPoint/test");
const DESCRIBE = Symbol("QuickTap/TestPoint/describe");

export class TestPoint implements Hookable {
	public readonly name: string;
	private readonly _scope?: TestPoint;
	private readonly _subtests = new Set<TestPoint>();
	private readonly _fn: Fn;
	private _only?: boolean;
	private _skip?: boolean | string;
	private _todo?: boolean | string;
	private _block: Block;
	private _directive?: Directive;
	private _status?: Status;
	private readonly reporter: (statement: string) => void;
	private readonly indent: string;
	constructor(init: TestPointInitializer, reporter?: (statement: string) => void) {
		this.reporter = reporter || console.log;
		this._scope = init.scope;
		this.name = init.name || "<anonymous>";
		this._fn = init.fn || (() => {});
		this._only = init.only;
		this._skip = init.skip;
		this._todo = init.todo;
		this._block = init.block;
		this._directive = init.directive;
		this.isRoot = this._scope === undefined;
		this.indent = this._scope ? this._scope.indent + formalize.Indentation : formalize.EmptyString;
	}
	public readonly isRoot: boolean;
	public beforeEach(fn: Hook, options?: HookOptions) {}
	public afterEach(fn: Hook, options?: HookOptions) {}
	public before(fn: Hook, options?: HookOptions) {}
	public after(fn: Hook, options?: HookOptions) {}
	public diagnostic(message: string) {}
	public runOnly(shouldRunOnlyTests: boolean) {}
	public skip(message?: string) {}
	public todo(message?: string) {}
	public bailout(message?: string) {}
	public async run() {
		if (this.isRoot) {
			this.reporter("TAP version 14");
		}
		this._status = Status.Ok;
		try {
			if (this._block === Block.Describe) await (this._fn as Describe)({ name: this.name });
			if (this._block === Block.It) {
				if (this._fn.length > 0) {
					ッ(false, "done route not implemented yet");
				} else {
					await (this._fn as It)();
				}
			}
			if (this._block === Block.Test) {
				if (this._fn.length > 1) {
					ッ(false, "done route not implemented yet");
				} else {
					await (this._fn as Test)(this);
				}
			}
		} catch (err) {
			this._status = Status.NotOk;
		}
		// while fn() runs, it asserts and adds subtests
		// here assertions are done and also the subtests are run
		// we should make sure subtests do not last longer than the parent test
		// we should make sure subtests do not run if the parent test is skipped
		// we should make sure subtests do not run if the parent test is todo

		// leaf plan don't report anything, they just run
		if (this._subtests.size === 0) return;
		this.reporter(`${this.indent}1..${this._subtests.size}`);
		this._report();
		for (const test of this._subtests) {
			test._report();
		}
	}
	private _report() {
		ッ(this._status !== undefined, "test must run first");
		this.reporter(`${this.indent}${this._status === Status.Ok ? "ok" : "not ok"} - ${this.name}`);
	}
	public readonly it: PlanTestWithDirective<It> = _it.bind(this);
	public readonly test: PlanTestWithDirective<Test> = _it.bind(this);
	public readonly describe: PlanTestWithDirective<Describe> = _describe.bind(this);
	async [DESCRIBE](name: string, options: TestPlanConfiguration, fn: Describe) {
		const test = new TestPoint({ name, fn, scope: this, ...options, block: Block.Describe }, this.reporter);
		this._subtests.add(test);
		await test.run();
	}
	async [IT](name: string, options: TestPlanConfiguration, fn: It) {
		const test = new TestPoint({ name, fn, scope: this, ...options, block: Block.Test }, this.reporter);
		this._subtests.add(test);
		await test.run();
	}
	async [TEST](name: string, options: TestPlanConfiguration, fn: Test) {
		const test = new TestPoint({ name, fn, scope: this, ...options, block: Block.It }, this.reporter);
		this._subtests.add(test);
		await test.run();
	}
	public [Symbol.toPrimitive]() {
		return this.toString();
	}
	public toString() {
		return JSON.stringify(this);
	}
	public toJSON() {
		ッ(this._status, "Cannot serialize a test point that has not been ran yet.");
		return {
			name: this.name,
			directive: this._directive,
		};
	}
}
async function _it(this: TestPoint, name: string, fn: It): Promise<void>;
async function _it(this: TestPoint, name: string, options: TestPlanConfiguration, fn: It): Promise<void>;
async function _it(this: TestPoint, name: string, ...args: [It] | [TestPlanConfiguration, It]) {
	const fn = args.length === 1 ? args[0] : args[1];
	const options = args.length === 1 ? TestPlanConfiguration.Default : args[0];
	await this[IT](name, options, fn);
}
_it.skip = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: It) {
	await this[IT](name, { ...options, skip: true }, fn);
};
_it.todo = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: It) {
	await this[IT](name, { ...options, todo: true }, fn);
};
async function _describe(this: TestPoint, name: string, fn: Describe): Promise<void>;
async function _describe(this: TestPoint, name: string, options: TestPlanConfiguration, fn: Describe): Promise<void>;
async function _describe(this: TestPoint, name: string, ...args: [Describe] | [TestPlanConfiguration, Describe]) {
	const fn = args.length === 1 ? args[0] : args[1];
	const options = args.length === 1 ? TestPlanConfiguration.Default : args[0];
	await this[DESCRIBE](name, options, fn);
}
_describe.skip = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: Describe) {
	await this[DESCRIBE](name, { ...options, skip: true }, fn);
};
_describe.todo = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: Describe) {
	await this[DESCRIBE](name, { ...options, todo: true }, fn);
};
async function _test(this: TestPoint, name: string, fn: Test): Promise<void>;
async function _test(this: TestPoint, name: string, options: TestPlanConfiguration, fn: Test): Promise<void>;
async function _test(this: TestPoint, name: string, ...args: [Test] | [TestPlanConfiguration, Test]) {
	const fn = args.length === 1 ? args[0] : args[1];
	const options = args.length === 1 ? TestPlanConfiguration.Default : args[0];
	await this[TEST](name, options, fn);
}
_test.skip = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: Test) {
	await this[TEST](name, { ...options, skip: true }, fn);
};
_test.todo = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: Test) {
	await this[TEST](name, { ...options, todo: true }, fn);
};

const root = new TestPoint({ block: Block.Default });
export const run = root.run;
export const describe = root.describe;
export const test = root.test;
export const it = root.it;

export type Fn = It | Test | Describe;
export interface It {
	(done?: (error?: any) => void): void | Promise<void>;
}
export interface Describe {
	(context: SuiteContext): void | Promise<void>;
}
export interface Test {
	(context: TestContext, done?: (error?: any) => void): void | Promise<void>;
}
export interface SuiteContext {
	readonly name: string;
}
export interface TestContext extends TestPoint {}
export type Hook = (context: TestContext) => any;
export interface HookOptions {
	readonly timeout?: number;
}
