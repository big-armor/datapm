import { RecordContext, RecordStreamContext, Source } from "datapm-lib";
import { Transform, TransformCallback, TransformOptions } from "stream";
import { StreamSetPreview } from "../main";
import { StreamSummary } from "../connector/Source";

/** Applies additional context about the stream from which the records are obtained. This is internal, and not to be exposed to
 * the connectors interfaces.
 */
export class RecordStreamContextTransform extends Transform {
    constructor(
        private source: Source,
        private streamSetPreview: StreamSetPreview,
        private streamSummary: StreamSummary,
        opts?: TransformOptions
    ) {
        super({ ...opts, objectMode: true });
    }

    async _transform(
        recordContexts: RecordContext[],
        _encoding: BufferEncoding,
        callback: TransformCallback
    ): Promise<void> {
        const chunksToSend: RecordStreamContext[] = [];

        for (const chunk of recordContexts) {
            const recordStreamContext: RecordStreamContext = {
                recordContext: chunk,
                sourceType: this.source.type,
                sourceSlug: this.source.slug,
                streamSetSlug: this.streamSetPreview.slug,
                streamSlug: this.streamSummary.name,
                updateMethod: this.streamSummary.updateMethod
            };

            chunksToSend.push(recordStreamContext);
        }

        callback(null, chunksToSend);
    }
}
