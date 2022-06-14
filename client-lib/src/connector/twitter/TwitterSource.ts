import { DPMConfiguration, DPMRecord, ParameterType, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { JobContext } from "../../task/JobContext";
import { InspectionResults, Source } from "../Source";
import { TYPE } from "./TwitterConnectorDescription";
import { TwitterApi, ETwitterStreamEvent, Tweetv2FieldsParams, TweetStream } from "twitter-api-v2";

const streamOptions: Partial<Tweetv2FieldsParams> = {
    "tweet.fields": [
        "id",
        "created_at",
        "text",
        "public_metrics",
        "lang",
        "reply_settings",
        "in_reply_to_user_id",
        "organic_metrics",
        "conversation_id",
        "source",
        "geo",
        "entities"
    ],
    "place.fields": ["country_code", "name", "country", "place_type"],
    expansions: ["author_id", "geo.place_id"]
};
export class TwitterSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    async inspectData(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<InspectionResults> {
        if (configuration.search == null) {
            if (configuration.streamType == null) {
                const response = await jobContext.parameterPrompt([
                    {
                        name: "streamType",
                        type: ParameterType.Select,
                        options: [
                            {
                                title: "Search/Filter Stream",
                                value: "search"
                            },
                            {
                                title: "Sample Stream",
                                value: "sample"
                            }
                        ],
                        configuration,
                        message: "Select Twitter Stream Type"
                    }
                ]);

                configuration.streamType = response.streamType;
            }

            if (configuration.streamType === "search") {
                const response = await jobContext.parameterPrompt([
                    {
                        configuration,
                        name: "search",
                        message: "Twitter Search Query?",
                        type: ParameterType.Text,
                        stringMinimumLength: 1
                    }
                ]);

                configuration.search = response.search;
            }
        } else {
            configuration.streamType = "search";
        }

        return {
            configuration,
            defaultDisplayName: "TweetStream",
            source: this,
            streamSetPreviews: [
                {
                    slug: "tweetStream",
                    streamSummaries: [
                        {
                            name: "tweetStream",
                            updateMethod: UpdateMethod.CONTINUOUS,
                            openStream: async () => {
                                const client = new TwitterApi(credentialsConfiguration.bearerToken as string);

                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                let stream: TweetStream<any>;

                                if (configuration.streamType === "search") {
                                    const rules = await client.v2.streamRules();

                                    if (rules.data != null) {
                                        await client.v2.updateStreamRules({
                                            delete: {
                                                ids: rules.data?.map((rule) => rule.id as string)
                                            }
                                        });
                                    }

                                    await client.v2.updateStreamRules({
                                        add: [
                                            {
                                                value: configuration.search as string
                                            }
                                        ]
                                    });

                                    stream = await client.v2.searchStream(streamOptions);
                                } else if (configuration.streamType === "sample") {
                                    stream = await client.v2.sampleStream(streamOptions);
                                } else {
                                    throw new Error("Unknown stream type " + configuration.streamType);
                                }

                                const returnWritable = new PassThrough({
                                    objectMode: true
                                });

                                let stop = false;

                                returnWritable.on("close", () => {
                                    stop = true;
                                    stream.close();
                                });

                                stream.on(ETwitterStreamEvent.Error, (event) => {
                                    jobContext.print("ERROR", JSON.stringify(event.error));
                                });

                                stream.on(ETwitterStreamEvent.Data, (event) => {
                                    const geoObject = event.data.geo;
                                    if (geoObject && Object.keys(geoObject).length === 0) {
                                        delete event.data.geo;
                                    }

                                    event.data.created_at = new Date(event.data.created_at);

                                    event.data.author = (event.includes.users as { id: string }[]).find(
                                        (user) => user.id === event.data.author_id
                                    );

                                    if (event.data.geo?.place_id != null) {
                                        event.data.place = (event.includes.places as { id: string }[]).find(
                                            (place) => place.id === event.data.geo.place_id
                                        );
                                    }

                                    const recordContext: RecordContext = {
                                        record: (event.data as unknown) as DPMRecord,
                                        schemaSlug: "tweets",
                                        receivedDate: new Date()
                                    };

                                    if (event != null) {
                                        returnWritable.push(recordContext);
                                    }
                                });

                                stream.on(ETwitterStreamEvent.ConnectionClosed, () => {
                                    returnWritable.end();
                                });

                                stream.autoReconnect = true;

                                return {
                                    stream: returnWritable
                                };
                            }
                        }
                    ]
                }
            ]
        };
    }
}
