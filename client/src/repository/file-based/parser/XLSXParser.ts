import { DPMConfiguration, DPMRecord } from "datapm-lib";
import { Transform, TransformCallback } from "stream";
import XLSX from "xlsx";
import { RecordContext, SourceInspectionContext, UpdateMethod } from "../../Source";
import { FileBufferSummary, ParserInspectionResults, Parser } from "./Parser";
import { DISPLAY_NAME, MIME_TYPE } from "./XLSXParserDescription";

class BufferTransform extends Transform {
    buffers: Buffer[] = [];

    _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
        this.buffers.push(chunk);
        callback(null);
    }

    _flush(callback: (error?: Error | null) => void): void {
        this.push(Buffer.concat(this.buffers));
        this.buffers = [];
        callback(null);
    }
}

export class XLSXParser implements Parser {
    getFileExtensions(): string[] {
        return ["xlsx"];
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    /** The unique identifier for the parser implementation */
    getMimeType(): string {
        return MIME_TYPE;
    }

    /** Returns a set of parameters based on the provided uri and configuration */
    async inspectFile(
        fileStreamSummary: FileBufferSummary,
        _configuration: DPMConfiguration,
        _context: SourceInspectionContext
    ): Promise<ParserInspectionResults> {
        return {
            schemaPrefix: fileStreamSummary.fileName?.toLowerCase().replace(".xlsx", ""),
            updateMethods: [UpdateMethod.BATCH_FULL_SET],
            stream: fileStreamSummary.stream
        };
    }

    /** Returns the transforms necessary parse based on the configuration */
    getTransforms(_schemaPrefix: string, _configuration?: DPMConfiguration): Array<Transform> {
        return [
            new BufferTransform(),
            new Transform({
                readableObjectMode: true,
                writableObjectMode: false,
                transform: function (chunk, encoding, callback) {
                    const workbook = XLSX.read(chunk, { type: "buffer" });
                    Object.keys(workbook.Sheets).forEach((sheetName) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const parsedSheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        parsedSheet.forEach((row: any) => {
                            const sanitizedRow: DPMRecord = {};
                            Object.keys(row).forEach((key) => {
                                let sanitizedKey = key.trim();
                                let sanitizedValue = row[key];
                                if (sanitizedKey === "__EMPTY") {
                                    sanitizedKey = "Column 0";
                                } else if (sanitizedKey.includes("__EMPTY_")) {
                                    sanitizedKey = sanitizedKey.replace("__EMPTY_", "Column ");
                                }
                                if (typeof sanitizedValue === "string") {
                                    sanitizedValue = sanitizedValue.trim();
                                }
                                sanitizedRow[sanitizedKey] = sanitizedValue;
                            });
                            const returnValue: RecordContext = {
                                record: sanitizedRow,
                                schemaSlug: sheetName
                            };
                            this.push(returnValue);
                        });
                    });
                    callback(null);
                }
            })
        ];
    }
}
