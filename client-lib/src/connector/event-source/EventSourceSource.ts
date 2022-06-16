import { DPMConfiguration, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { JobContext } from "../../task/JobContext";
import { InspectionResults, Source } from "../Source";
import { TYPE } from "./EventSourceConnectorDescription";
import EventSource from "eventsource";

export class EventSourceSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    async inspectData(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<InspectionResults> {
        return {
            configuration,
            defaultDisplayName: "events",
            source: this,
            streamSetPreviews: [
                {
                    slug: "events",
                    streamSummaries: [
                        {
                            name: "events",
                            updateMethod: UpdateMethod.CONTINUOUS,
                            openStream: async (sinkState) => {
                                const eventSource = new EventSource(connectionConfiguration.url as string);

                                const stream = new PassThrough({
                                    objectMode: true
                                });

                                eventSource.onerror = (event) => {
                                    stream.end();
                                };

                                eventSource.onmessage = (event) => {
                                    const data = JSON.parse(event.data);
                                    const recordContext: RecordContext = {
                                        receivedDate: new Date(),
                                        record: data,
                                        schemaSlug: "event"
                                    };
                                    stream.push(recordContext);
                                };

                                stream.on("close", () => {
                                    eventSource.close();
                                });

                                return {
                                    stream
                                };
                            }
                        }
                    ]
                }
            ]
        };
    }
}
