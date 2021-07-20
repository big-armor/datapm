import { DPMConfiguration } from "../../../../../lib/dist/src/PackageUtil";
import { Parameter } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";

export class BigQueryRepository implements Repository {
    getConnectionParameters(_connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        return [];
    }

    getAuthenticationParameters(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        return []; // TODO implement big query authentication ENV reading or configuration parameters
        // DANGER DANGER DANGER -- do not read google credentials from ENV when running in server mode
        // maybe just don't read them from the environment?
        // maybe always run sources in a separate process??
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true;
    }

    async testAuthentication(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO test that provided auth is valid with google
    }
}
