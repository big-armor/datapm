import { DPMConfiguration } from "../../../../../lib/dist/src/PackageUtil";
import { Parameter } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";

export class LocalFileRepository implements Repository {
    getConnectionParameters(_connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        return []; // The source and sink implementations define how to access the files
    }

    getAuthenticationParameters(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        return [];
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true;
    }

    async testAuthentication(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true;
    }
}
