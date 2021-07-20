import { Maybe } from "../util/Maybe";
import { getRepositoryDescriptions } from "./RepositoryUtil";
import { SinkDescription } from "./Sink";

export async function getSinkDescriptions(): Promise<SinkDescription[]> {
    const values = await (await Promise.all(getRepositoryDescriptions())).asyncMap((s) => s.getSinkDescription());

    return values.filter((f) => f != null) as SinkDescription[];
}

export async function getSinkDescription(type: string): Promise<Maybe<SinkDescription>> {
    return (
        (await getRepositoryDescriptions()
            .find((repo) => repo.getType() === type)
            ?.getSinkDescription()) || null
    );
}
