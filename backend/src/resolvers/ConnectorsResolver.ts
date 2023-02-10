import {
    ConnectorDescription,
    CONNECTORS,
    CONNECTOR_TYPE_LOCAL_FILE,
    CONNECTOR_TYPE_STANDARD_OUT
} from "datapm-client-lib";
import { GraphQLResolveInfo } from "graphql";
import { AuthenticatedContext } from "../context";

export const EXCLUDED_CONNECTORS = [CONNECTOR_TYPE_LOCAL_FILE, CONNECTOR_TYPE_STANDARD_OUT];

export const listConnectors = async (
    _1: unknown,
    _2: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<ConnectorDescription[]> => {
    return CONNECTORS.filter((c) => !EXCLUDED_CONNECTORS.includes(c.getType())).asyncMap(async (c) => {
        return {
            connectorType: c.getType(),
            displayName: c.getDisplayName(),
            hasSink: c.hasSink(),
            hasSource: c.hasSource()
        };
    });
};
