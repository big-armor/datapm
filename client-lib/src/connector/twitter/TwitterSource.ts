import { DPMConfiguration, ParameterType, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough, Readable } from "stream";
import Client from "twitter-api-sdk";
import { JobContext } from "../../task/JobContext";
import { InspectionResults, Source } from "../Source";
import { TYPE } from "./TwitterConnectorDescription";

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
                                const client = new Client(credentialsConfiguration.bearerToken as string);

                                const stream = client.tweets.searchStream({
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

                                const rules = await client.tweets.getRules();

                                if (rules.data != null) {
                                    await client.tweets.addOrDeleteRules({
                                        delete: {
                                            ids: rules.data?.map((rule) => rule.id as string)
                                        }
                                    });
                                }

                                await client.tweets.addOrDeleteRules({
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

                                returnWritable.on("close", () => {
                                    stop = true;
                                });

                                setTimeout(async () => {
                                    for await (const tweet of stream) {
                                        if (stop) {
                                            break;
                                        }

                                        const recordContext: RecordContext = {
                                            record: tweet.data,
                                            schemaSlug: "tweets",
                                            receivedDate: new Date()
                                        };

                                        if (tweet != null) {
                                            returnWritable.push(recordContext);
                                        }
                                    }
                                }, 1);

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
