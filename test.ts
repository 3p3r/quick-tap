import { describe, it, run, test } from "./index";

import assert from "assert";

describe("test1", () => {
	it("test2", () => {
		assert.ok(true);
	});
	it("test3", () => {
		assert.ok(false);
	});
});

test("test4", (ctx) => {
	ctx.test("test5", () => {
		assert.ok(true);
	});
	ctx.test("test6", () => {
		assert.ok(false);
	});
});

run();
