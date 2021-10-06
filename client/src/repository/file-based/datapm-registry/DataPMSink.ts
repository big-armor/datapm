import { DPMConfiguration, PackageFile, Schema, SinkState, SinkStateKey } from "datapm-lib";
import { Maybe } from "../../../util/Maybe";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { Sink, SinkSupportedStreamOptions, WritableWithContext } from "../../Sink";
import { UpdateMethod } from "../../Source";
import { DISPLAY_NAME, TYPE } from "./DataPMRepositoryDescription";
import request = require("superagent");

export class DataPMSink implements Sink {
    isStronglyTyped(_configuration: DPMConfiguration): boolean | Promise<boolean> {
        return true;
    }

    getParameters(
        catalogSlug: string | undefined,
        schema: PackageFile,
        configuration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
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

    getSupportedStreamOptions(
        _configuration: DPMConfiguration,
        _sinkState: Maybe<SinkState>
    ): SinkSupportedStreamOptions {
        return {
            streamSetProcessingMethods: [StreamSetProcessingMethod.PER_STREAM],
            updateMethods: [UpdateMethod.APPEND_ONLY_LOG, UpdateMethod.APPEND_ONLY_LOG]
        };
    }

    async getWriteable(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod
    ): Promise<WritableWithContext> {
        const uri =
            `${connectionConfiguration.url}/data/${configuration.catalogSlug}/${configuration.packageSlug}/${configuration.majorVersion}/${schema.title}?updateMethod=` +
            updateMethod.toString();

        const req = await request.post(uri);


        req.body.

        return {
            transforms: [req]
        };
    }

    filterDefaultConfigValues(
        _catalogSlug: string | undefined,
        _packageFile: PackageFile,
        _configuration: DPMConfiguration
    ): void {
        // Nothing to do
    }

    saveSinkState(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        sinkStateKey: SinkStateKey,
        sinkState: SinkState
    ): Promise<void> {
        throw new Error("Method not implemented.");
    }

    getSinkState(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        SinkStateKey: SinkStateKey
    ): Promise<Maybe<SinkState>> {
        throw new Error("Method not implemented.");
    }

    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }
}
