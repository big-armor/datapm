import { DPMConfiguration, ParameterType } from "datapm-lib";
import { Writable } from "stream";
import unzipper, { Entry } from "unzipper";
import { JobContext } from "../../../task/Task";
import { AbstractArchiveParser, FileIterator } from "./AbstractArchiveParser";
import { FileBufferSummary } from "./Parser";
import { DISPLAY_NAME, EXTENSIONS, MIME_TYPE, MIME_TYPES } from "./ZIPParserDescription";

class WritablePassThrough extends Writable {
    // eslint-disable-next-line
    _write(_chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        callback();
    }
}

export class ZIPParser extends AbstractArchiveParser {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getFileExtensions(): string[] {
        return EXTENSIONS;
    }

    /** The unique identifier for the parser implementation */
    getMimeType(): string {
        return MIME_TYPE;
    }

    getSupportedMimeTypes(): string[] {
        return MIME_TYPES;
    }

    /** Returns a set of parameters based on the provided uri and configuration */
    async getInnerFileIterator(
        fileStreamSummary: FileBufferSummary,
        configuration: DPMConfiguration,
        context: JobContext
    ): Promise<FileIterator> {
        if (configuration.fileRegex == null) {
            await context.parameterPrompt([
                {
                    configuration,
                    type: ParameterType.Text,
                    name: "fileRegex",
                    message: "Filename Regex?",
                    defaultValue: ".*"
                }
            ]);
        }

        const pendingEntries: (Entry | null)[] = [];

        fileStreamSummary.stream
            .pipe(unzipper.Parse())
            .on("entry", (entry: Entry) => {
                if (
                    entry.type !== "Directory" &&
                    this.isFileNameMatched(entry.path, configuration.fileRegex as string)
                ) {
                    pendingEntries.push(entry);
                } else {
                    entry.pipe(new WritablePassThrough());
                }
            })
            .on("close", () => {
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
                                    fileName: entry.path,
                                    uri: fileStreamSummary.uri + "!" + entry.path,
                                    openStream: async () => {
                                        return {
                                            stream: entry
                                        };
                                    }
                                });
                            }
                        }
                    }, 50);
                });
            }
        };
    }

    /** Check if file name is matched with fileRegex */
    isFileNameMatched(filePath: string, fileRegex: string): boolean {
        const segments = filePath.split("/");
        const fileName = segments[segments.length - 1];
        const regExp = new RegExp(fileRegex);
        return regExp.test(fileName);
    }
}
