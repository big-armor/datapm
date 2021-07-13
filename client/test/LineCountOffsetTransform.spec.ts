import { expect } from "chai";
import { EventEmitter } from "events";
import { test } from "mocha";
import { Writable } from "stream";
import { LineCountOffsetTransform } from "../src/source/transforms/LineCountOffsetTransform";

async function awaitEvent(event: string, subject: EventEmitter, timeoutMS = 1000) {
	return new Promise<void>((resolve, reject) => {
		const timeoutHandle = setTimeout(() => {
			reject(new Error("timeout reached"));
		}, timeoutMS);

		subject.on(event, () => {
			clearTimeout(timeoutHandle);
			subject.removeAllListeners();
			resolve();
		});
	});
}

describe("Check line count off set transform ", () => {
	test("Should emit perfectly spaced new lines", async () => {
		const startBuffer = "start";

		const transform = new LineCountOffsetTransform(1);

		let outputData = "";

		const subject = new EventEmitter();

		transform.pipe(
			new Writable({
				write: (chunk, encoding, callback) => {
					outputData = outputData.concat(chunk.toString());
					subject.emit("data");
					callback();
				}
			})
		);

		expect(outputData).equal("");

		transform.write(startBuffer);

		expect(outputData).equal("");

		transform.write(" line\n and another line");

		await awaitEvent("data", subject);

		expect(transform.currentOffset).eq(1);

		expect(outputData).equal("start line\n");

		setTimeout(() => {
			transform.write("\n more");
		}, 1);

		await awaitEvent("data", subject);

		expect(transform.currentOffset).eq(2);

		expect(outputData).equal("start line\n and another line\n");
	});
});
