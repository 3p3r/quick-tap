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
export interface TestPlanConfiguration {
	readonly timeout?: number;
	readonly signal?: AbortSignal;
	readonly skip?: boolean | string;
	readonly todo?: boolean | string;
	readonly only?: boolean;
	readonly concurrency?: number;
}
export interface TestRunConfiguration {
	readonly timeout?: number;
	readonly signal?: AbortSignal;
}
export interface TestPlanWithDirective {
	(this: TestPoint): void;
	skip(this: TestPoint): void;
	todo(this: TestPoint): void;
}

// internal to the library, not exported
const IT = Symbol("QuickTap/TestPoint/it");
const TEST = Symbol("QuickTap/TestPoint/test");
const DESCRIBE = Symbol("QuickTap/TestPoint/describe");

export class TestPoint {
	public readonly scope?: TestPoint;
	public readonly subtests = new Set<TestPoint>();
	public readonly name: string;
	public readonly directive?: Directive;
	public readonly fn: Fn;
	public status?: Status;
	public readonly reporter: (statement: string) => void;
	public readonly indent = this.scope ? this.scope.indent + formalize.Indentation : formalize.EmptyString;
	constructor(
		{ name, fn = () => {}, directive = undefined, scope = undefined }: TestPointInitializer,
		reporter?: (statement: string) => void,
	) {
		this.reporter = reporter || console.log;
		this.scope = scope;
		this.name = name || "<anonymous>";
		this.directive = directive;
		this.fn = fn;
	}
	public readonly isRoot = this.scope === undefined;
	public readonly run = _run.bind(this);
	public readonly it: TestPlanWithDirective = _it.bind(this);
	public readonly test: TestPlanWithDirective = _it.bind(this);
	public readonly describe: TestPlanWithDirective = _describe.bind(this);
	async [DESCRIBE](name: string, options: TestPlanConfiguration, fn: DescribeFn) {}
	async [TEST](name: string, options: TestPlanConfiguration, fn: TestFn) {}
	async [IT](name: string, options: TestPlanConfiguration, fn: ItFn) {}
	public [Symbol.toPrimitive]() {
		return this.toString();
	}
	public toString() {
		return JSON.stringify(this);
	}
	public toJSON() {
		ッ(this.status, "Cannot serialize a test point that has not been ran yet.");
		return {
			name: this.name,
			directive: this.directive,
		};
	}
}
async function _run(this: TestPoint) {
	if (this.isRoot) {
		this.reporter("TAP version 14");
	}
	this.reporter(`1..${this.subtests.size}`);
	await Promise.all([...this.subtests].map((test) => test.run()));
}
async function _it(this: TestPoint, name: string, options: TestPlanConfiguration, fn: ItFn) {
	await this[IT](name, options, fn);
}
_it.skip = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: ItFn) {
	await this[IT](name, { ...options, skip: true }, fn);
};
_it.todo = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: ItFn) {
	await this[IT](name, { ...options, todo: true }, fn);
};
async function _describe(this: TestPoint, name: string, options: TestPlanConfiguration, fn: DescribeFn) {
	await this[DESCRIBE](name, options, fn);
}
_describe.skip = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: DescribeFn) {
	await this[DESCRIBE](name, { ...options, skip: true }, fn);
};
_describe.todo = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: DescribeFn) {
	await this[DESCRIBE](name, { ...options, todo: true }, fn);
};
async function _test(this: TestPoint, name: string, options: TestPlanConfiguration, fn: TestFn) {
	await this[TEST](name, options, fn);
}
_test.skip = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: TestFn) {
	await this[TEST](name, { ...options, skip: true }, fn);
};
_test.todo = async function (this: TestPoint, name: string, options: TestPlanConfiguration, fn: TestFn) {
	await this[TEST](name, { ...options, todo: true }, fn);
};

const root = new TestPoint({ name: "" });
export const run = root.run;
export const describe = root.describe;
export const test = root.test;
export const it = root.it;

export type Fn = ItFn | TestFn | DescribeFn;
export interface ItFn {
	(done?: (error?: any) => void): void | Promise<void>;
}
export interface DescribeFn {
	(context: SuiteContext): void | Promise<void>;
}
export interface TestFn {
	(context: TestContext, done?: (error?: any) => void): void | Promise<void>;
}

export interface SuiteContext {
	readonly name: string;
	readonly signal: AbortSignal;
}
export interface TestContext {
	readonly name: string;
	readonly signal: AbortSignal;
	beforeEach(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	afterEach(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	beforeAll(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	afterAll(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	before(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	after(fn: TestContext.HookFn, options?: TestContext.HookOptions): void;
	diagnostic(message: string): void;
	runOnly(shouldRunOnlyTests: boolean): void;
	skip(message?: string): void;
	todo(message?: string): void;
	test(name: string, options: TestPlanConfiguration, fn: TestFn): Promise<void>;
}
export namespace TestContext {
	export type HookFn = (context: TestContext) => any;
	export interface HookOptions {
		readonly timeout?: number;
		readonly signal?: AbortSignal;
	}
}
