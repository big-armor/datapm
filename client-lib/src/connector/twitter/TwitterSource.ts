import { DPMConfiguration, DPMRecord, ParameterType, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { JobContext } from "../../task/JobContext";
import { InspectionResults, Source } from "../Source";
import { TYPE } from "./TwitterConnectorDescription";
import { TwitterApi, ETwitterStreamEvent } from "twitter-api-v2";
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

                                const returnWritable = new PassThrough({
                                    objectMode: true
                                });

                                let stop = false;

                                const stream = await client.v2.searchStream({
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
                                        "geo",
                                        "entities"
                                    ],
                                    expansions: ["author_id"]
                                });

                                returnWritable.on("close", () => {
                                    stop = true;
                                    stream.close();
                                });

                                stream.on(ETwitterStreamEvent.Data, (event) => {
                                    const geoObject = event.data.geo;
                                    if (geoObject && Object.keys(geoObject).length === 0) {
                                        delete event.data.geo;
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
