import { Maybe } from "../util/Maybe";
import { BigQuerySinkDescription } from "./BigQuerySink";
import { LocalFileSinkDescription } from "./LocalFileSink";
import { MongoSinkDescription } from "./MongoSink";
import { MySqlSinkDescription } from "./MySqlSink";
import { PostgresSinkDescription } from "./PostgresSink";
import { RedshiftSinkDescription } from "./RedshiftSink";
import { StandardOutSinkDescription } from "./StandardOutSink";
import { S3SinkDescription } from "./S3Sink";
import { Sink, SinkDescription } from "./Sink";

export function getSinks(): SinkDescription[] {
    return [
        new LocalFileSinkDescription(),
        new StandardOutSinkDescription(),
        new MySqlSinkDescription(),
        new PostgresSinkDescription(),
        new MongoSinkDescription(),
        new BigQuerySinkDescription(),
        new RedshiftSinkDescription(),
        new S3SinkDescription()
    ];
}

export async function getSink(type: string): Promise<Maybe<Sink>> {
    return (
        getSinks()
            .find((sink) => sink.getType() === type)
            ?.loadSinkFromModule() || null
    );
}
