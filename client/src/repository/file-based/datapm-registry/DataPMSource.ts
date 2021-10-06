import { StreamState, AvroBlockDecoder, base62, DPMConfiguration, DPMRecord, DPMRecordValue, Schema } from "datapm-lib";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import {
    InspectionResults,
    RecordContext,
    Source,
    SourceInspectionContext,
    StreamSetPreview,
    UpdateMethod
} from "../../Source";
import { TYPE } from "./DataPMRepositoryDescription";
import { getPackage } from "../../../util/PackageAccessUtil";
import { Maybe } from "../../../util/Maybe";
import { Transform } from "stream";
import { BatchingTransform } from "../../../transforms/BatchingTransform";
import request = require("superagent");

export class DataPMSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("datapm://") || uri.startsWith("datapms://");
    }

    getFileName(uri: string): string {
        const parts = uri.replace("datapm://", "").split("/");
        return parts[parts.length - 1] || "";
    }

    buildHttpUri(uri: string): string {
        return uri.replace("datapm://", "http://").replace("datapms://", "https://");
    }

    async getInspectParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Parameter[]> {
        if (configuration.catalogSlug == null) {
            return [
                {
                    type: ParameterType.Text,
                    message: "Catalog Slug?",
                    name: "catalogSlug",
                    configuration: configuration
                    // TODO implement options
                }
            ];
        }

        if (configuration.packageSlug == null) {
            return [
                {
                    type: ParameterType.Text,
                    message: "Package Slug?",
                    name: "packageSlug",
                    configuration: configuration
                }
            ];
        }

        // TODO should this just be version to make it easier?
        if (configuration.majorVersion == null) {
            return [
                {
                    type: ParameterType.Number,
                    message: "Major Version?",
                    name: "majorVersion",
                    configuration: configuration
                }
            ];
        }

        return [];
    }

    async inspectURIs(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        _context: SourceInspectionContext
    ): Promise<InspectionResults> {
        const packageFile = await getPackage(
            `${connectionConfiguration.url}/${configuration.catalogSlug}/${configuration.packageSlug}`
        );

        const streamSetPreviews: StreamSetPreview[] = packageFile.packageFile.schemas.map<StreamSetPreview>(
            (schema) => {
                let uri = `${connectionConfiguration.url}/data/${configuration.catalogSlug}/${configuration.packageSlug}/${configuration.majorVersion}/${schema.title}`;

                if (schema.title == null) throw new Error("SCHEMA_HAS_NO_TITLE");

                let streamIndex = 0;

                return {
                    configuration,
                    slug: schema.title,
                    supportedUpdateMethods: [UpdateMethod.APPEND_ONLY_LOG, UpdateMethod.BATCH_FULL_SET],
                    moveToNextStream: async () => {
                        if (streamIndex++ > 0) return null;

                        const response = await request.options(this.buildHttpUri(uri));

                        let lastUpdatedHash = new Date().toISOString();

                        if (typeof response.headers.etag === "string") lastUpdatedHash = response.headers.etag;

                        if (schema.title == null) throw new Error("SCHEMA_HAS_NO_TITLE");

                        return {
                            slug: schema.title,
                            updateHash: lastUpdatedHash,
                            name: schema.title,
                            openStream: async (streamState: Maybe<StreamState>) => {
                                if (schema.title == null) throw new Error("SCHEMA_HAS_NO_TITLE");

                                const offSetHash = streamState?.streamOffset;

                                if (offSetHash != null) {
                                    uri += `?offset=${offSetHash}`;
                                }

                                const response = await request
                                    .get(this.buildHttpUri(uri))
                                    .set("Accept", "application/json");
                                let expectedBytes = 0;

                                if (response.headers["content-length"])
                                    expectedBytes = Number.parseInt(response.headers["content-length"]);

                                let lastUpdatedHash = new Date().toISOString();

                                if (typeof response.headers.etag === "string") lastUpdatedHash = response.headers.etag;

                                return {
                                    stream: response.body,
                                    transforms: [
                                        new AvroBlockDecoder(),
                                        new BatchingTransform(100),
                                        this.avroObjectsToRecords(schema)
                                    ],
                                    fileName: schema.title,
                                    fileSize: expectedBytes,
                                    reportedMimeType: response.header["content-type"],
                                    lastUpdatedHash
                                };
                            }
                        };
                    }
                };
            }
        );

        return {
            defaultDisplayName: packageFile.packageFile.displayName,
            source: this,
            configuration,
            streamSetPreviews
        };
    }

    avroObjectsToRecords(schema: Schema): Transform {
        return new Transform({
            objectMode: true,
            transform: (chunk: unknown[], encoding, callback) => {
                if (schema.title == null) throw new Error("SCHEMA_HAS_NO_TITLE");

                const records: RecordContext[] = [];

                for (const avroRecord of chunk as Record<string, unknown>[]) {
                    const record: DPMRecord = {};

                    for (const key of Object.keys(avroRecord)) {
                        const base62EncodedFieldName = key.substr(4).substr(0, key.lastIndexOf("_"));

                        const decodedFieldName = base62.decodeBase62(base62EncodedFieldName);
                        record[decodedFieldName] = avroRecord[key] as DPMRecordValue;
                    }

                    records.push({
                        record,
                        schemaSlug: schema.title
                    });
                }

                callback(null, records);
            }
        });
    }
}
