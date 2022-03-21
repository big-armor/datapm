import { Writable } from "stream";
import { SinkState, RecordStreamContext } from "datapm-lib";

/** this class updates the provided SinkState object with the observed records that are received to this writable.
 * This SinkState is later used to persist the successfully written records.
 */
export class SinkStateWritable extends Writable {
    sinkState: SinkState;

    constructor(sinkStateReference: SinkState) {
        super({
            objectMode: true
        });
        this.sinkState = sinkStateReference;
    }

    _write(chunk: RecordStreamContext, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        if (!chunk || chunk.recordContext.offset == null) {
            callback();
            return;
        }

        if (this.sinkState.streamSets[chunk.streamSetSlug] == null) {
            this.sinkState.streamSets[chunk.streamSetSlug] = {
                streamStates: {}
            };
        }

        const streamSetState = this.sinkState.streamSets[chunk.streamSetSlug];

        if (streamSetState.streamStates[chunk.streamSlug] == null) {
            streamSetState.streamStates[chunk.streamSlug] = {
                schemaStates: {}
            };
        }

        const streamState = streamSetState.streamStates[chunk.streamSlug];

        streamState.streamOffset = chunk.recordContext.offset;

        if (streamState.schemaStates[chunk.recordContext.schemaSlug] == null) {
            streamState.schemaStates[chunk.recordContext.schemaSlug] = {
                lastOffset: null
            };
        }

        streamState.schemaStates[chunk.recordContext.schemaSlug].lastOffset = chunk.recordContext.offset || null;

        callback();
    }
}
