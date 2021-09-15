import { DPMConfiguration } from "datapm-lib";
import { Readable } from "stream";
import tar from "tar-stream";
import { SourceInspectionContext } from "../../Source";
import { ParameterType } from "../../../util/parameters/Parameter";
import { AbstractArchiveParser, FileIterator } from "./AbstractArchiveParser";
import { FileBufferSummary } from "./Parser";
import { DISPLAY_NAME, EXTENSIONS, MIME_TYPE, MIME_TYPES } from "./TARParserDescription";

export class TARParser extends AbstractArchiveParser {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    /** The unique identifier for the parser implementation */
    getMimeType(): string {
        return MIME_TYPE;
    }

    getSupportedMimeTypes(): string[] {
        return MIME_TYPES;
    }

    getFileExtensions(): string[] {
        return EXTENSIONS;
    }

    /** Returns a set of parameters based on the provided uri and configuration */
    async getInnerFileIterator(
        fileStreamSummary: FileBufferSummary,
        configuration: DPMConfiguration,
        context: SourceInspectionContext
    ): Promise<FileIterator> {
        if (configuration.filePattern == null) {
            await context.parameterPrompt([
                {
                    configuration,
                    type: ParameterType.Text,
                    name: "filePattern",
                    message: "Inner File Pattern?"
                }
            ]);
        }

        const pendingEntries: ({ header: tar.Headers; stream: Readable } | null)[] = [];

        fileStreamSummary.stream
            .pipe(tar.extract())
            .on("entry", async (header, innerFileStream, callback) => {
                innerFileStream.once("end", callback);
                if (
                    header.type !== "directory" &&
                    this.isFileNameMatched(header.name, configuration.filePattern as string)
                ) {
                    pendingEntries.push({ header, stream: innerFileStream });
                } else {
                    innerFileStream.resume();
                }
            })
            .on("finish", () => {
                pendingEntries.push(null);
            });

        return {
            moveToNextFile: async () => {
                return new Promise((resolve) => {
                    const interval = setInterval(() => {
                        if (pendingEntries.length > 0) {
                            clearInterval(interval);
                            const entry = pendingEntries.pop();
                            if (entry == null) {
                                resolve(null);
                            } else {
                                resolve({
                                    fileName: entry.header.name,
                                    uri: fileStreamSummary.uri + "!" + entry.header.name,
                                    fileSize: entry.header.size,
                                    openStream: async () => {
                                        return {
                                            stream: entry.stream,
                                            fileName: entry.header.name,
                                            fileSize: entry.header.size
                                        };
                                    }
                                });
                            }
                        }
                    });
                });
            }
        };
    }

    /** Check if file name is matched with file pattern */
    isFileNameMatched(filePath: string, filePattern: string): boolean {
        const segments = filePath.split("/");
        const fileName = segments[segments.length - 1];
        const regExp = new RegExp(filePattern.replace(/\*/g, ".*"));
        return regExp.test(fileName);
    }
}
