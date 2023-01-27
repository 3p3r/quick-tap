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
export interface TestPointInitializer {
	readonly fn?: Fn;
	readonly name?: string;
	readonly scope?: TestPoint;
	readonly directive?: Directive;
}
export namespace TestPointInitializer {
	export const Default: TestPointInitializer = {
		fn: () => {},
		name: "<anonymous>",
		scope: undefined,
		directive: undefined,
	};
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
	private readonly _name: string;
	private readonly _scope?: TestPoint;
	private readonly _subtests = new Set<TestPoint>();
	private readonly _fn: Fn;
	private _only: boolean;
	private _skip: boolean;
	private _todo: boolean;
	private _directive?: Directive;
	private _status?: Status;
	private readonly reporter: (statement: string) => void;
	private readonly indent = this._scope ? this._scope.indent + formalize.Indentation : formalize.EmptyString;
	constructor(
		{ name = "<anonymous>", fn = () => {}, directive, scope }: TestPointInitializer = TestPointInitializer.Default,
		reporter?: (statement: string) => void,
	) {
		this.reporter = reporter || console.log;
		this._scope = scope;
		this._name = name;
		this._directive = directive;
		this._fn = fn;
	}
	public readonly isRoot = this._scope === undefined;
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
		this.reporter(`1..${this._subtests.size}`);
		await Promise.all([...this._subtests].map((test) => test.run()));
	}
	public readonly it: PlanTestWithDirective<It> = _it.bind(this);
	public readonly test: PlanTestWithDirective<Test> = _it.bind(this);
	public readonly describe: PlanTestWithDirective<Describe> = _describe.bind(this);
	async [DESCRIBE](name: string, options: TestPlanConfiguration, fn: Describe) {
		const test = new TestPoint({ name, fn, scope: this }, this.reporter);
		this._subtests.add(test);
	}
	async [IT](name: string, options: TestPlanConfiguration, fn: It) {
		const test = new TestPoint({ name, fn, scope: this }, this.reporter);
		this._subtests.add(test);
	}
	async [TEST](name: string, options: TestPlanConfiguration, fn: Test) {
		const test = new TestPoint({ name, fn, scope: this }, this.reporter);
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
			name: this._name,
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

const root = new TestPoint();
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
	readonly signal: AbortSignal;
}
export interface TestContext extends TestPoint {
	readonly name: string;
	readonly signal: AbortSignal;
}
export type Hook = (context: TestContext) => any;
export interface HookOptions {
	readonly timeout?: number;
	readonly signal?: AbortSignal;
}
