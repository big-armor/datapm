import { DPMConfiguration } from "datapm-lib";
import fs from "fs";
import mime from "mime-types";
import path from "path";
import { FileStreamContext } from "../parser/Parser";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { AbstractFileStreamSource } from "../AbstractFileStreamSource";
import { Source } from "../../Source";
import glob from "glob";
import { TYPE } from "./LocalFileSourceDescription";

export class LocalFileSource extends AbstractFileStreamSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    removeSecretConfigValues(
        _configuration: DPMConfiguration
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    ): void {}

    getFilePath(uri: string): string {
        return uri.replace("file://", "");
    }

    getFileName(filePath: string): string {
        return path.basename(filePath);
    }

    async getInspectParameters(configuration: DPMConfiguration): Promise<Parameter[]> {
        if (typeof configuration.uri === "string") {
            configuration.uris = [configuration.uri];
            delete configuration.uri;
        }

        let parameters: Parameter[] = [];

        if (
            configuration.addAnother === true ||
            configuration.uris == null ||
            (configuration.uris as string[]).length === 0
        ) {
            parameters = [
                {
                    configuration,
                    type: ParameterType.Text,
                    name: "uri",
                    message: "File path?",
                    validate: (value: string | number | boolean) => {
                        if (value == null || (value as string).length === 0) {
                            return "File path required";
                        }

                        if (!fs.existsSync(value as string)) {
                            return "File not found";
                        }

                        return true;
                    }
                },
                {
                    configuration,
                    type: ParameterType.Confirm,
                    message: "Add another file?",
                    name: "addAnother",
                    defaultValue: false
                }
            ];
        }

        const paths = configuration.uris as string[];

        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];

            if (!path.startsWith("file://")) {
                paths[i] = "file://" + paths[i];
            }
        }

        delete configuration.addAnother;
        return parameters;
    }

    async getFileStreams(configuration?: DPMConfiguration): Promise<FileStreamContext[]> {
        // Each URI is a file pattern, representing one or more files as a streamSet

        const uris = configuration?.uris as string[];

        // Build a list of files
        const inputFilePaths = uris.map((u) => this.getFilePath(u));

        let filePaths: string[] = [];

        for (const filePath of inputFilePaths) {
            if (fs.existsSync(filePath)) {
                filePaths.push(filePath);
            } else if (!fs.existsSync(filePath)) {
                const files = await new Promise<string[]>((resolve, reject) => {
                    glob(filePath, (err, matches) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(matches);
                    });
                });

                if (files.length === 0) throw new Error("FILE_NOT_FOUND - " + files);

                filePaths = filePaths.concat(files);
            }
        }

        return filePaths.map((filePath) => {
            const fileName = this.getFileName(filePath);
            const mimeType = mime.lookup(fileName);

            const lastUpdatedHash = fs.statSync(filePath).mtime.toISOString();

            const fileSize = fs.statSync(filePath).size;

            let uri = filePath;

            if (!uri.startsWith("file://")) uri = "file://" + (path.isAbsolute(uri) ? "" : "." + path.sep) + uri;

            const sourceResponse: FileStreamContext = {
                openStream: async () => {
                    return {
                        stream: fs.createReadStream(filePath),
                        fileName,
                        fileSize,
                        lastUpdatedHash,
                        reportedMimeType: mimeType || undefined
                    };
                },
                uri,
                fileSize,
                reportedMimeType: mimeType || undefined,
                fileName,
                lastUpdatedHash
            };

            return sourceResponse;
        });
    }
}
