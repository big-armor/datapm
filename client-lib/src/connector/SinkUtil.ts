import { Maybe } from "../util/Maybe";
import { getConnectorDescriptions } from "./ConnectorUtil";
import { SinkDescription } from "./Sink";
import { asyncMap } from "../util/AsyncUtils";

export async function getSinkDescriptions(): Promise<SinkDescription[]> {
    const values = await asyncMap(
        getConnectorDescriptions().filter((r) => r.hasSink()),
        (r) => r.getSinkDescription()
    );

    return values.filter((f) => f != null) as SinkDescription[];
}

export async function getSinkDescription(type: string): Promise<Maybe<SinkDescription>> {
    return (
        (await getConnectorDescriptions()
            .find((repo) => repo.getType() === type)
            ?.getSinkDescription()) || null
    );
}
