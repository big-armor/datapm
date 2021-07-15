import { Transform, TransformCallback } from "stream";

export class QuoteTransform extends Transform {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        const chunkString = chunk.toString();
        let quotedChunkString = "";
        let segment = "";
        let quoted = false;
        for (let i = 0; i < chunkString.length; i += 1) {
            const char = chunkString[i];
            if (char === '"') {
                quoted = !quoted;
            } else if (char === ",") {
                if (!quoted) {
                    quotedChunkString += `"${segment}",`;
                    segment = "";
                } else {
                    segment += char;
                }
            } else if (char === "\r") {
                quotedChunkString += `"${segment}"\r\n`;
                segment = "";
                i += 1;
            } else {
                segment += char;
            }
        }
        callback(null, quotedChunkString);
    }
}
