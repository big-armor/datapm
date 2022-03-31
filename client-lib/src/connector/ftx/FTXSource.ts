/* eslint-disable camelcase */
import { DPMConfiguration, ParameterType, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { InspectionResults, Source, SourceInspectionContext } from "../Source";
import { TYPE } from "./FTXConnectorDescription";
import { URI, URI_US } from "./FTXSourceDescription";
import WebSocket from "ws";
import fetch from "cross-fetch";

type FtxRestResponse<T> = {
    success: boolean;
    result: T;
};

type FtxMarket = {
    name: string;
    baseCurrency?: string;
    quoteCurrency?: string;
    quoteVolume24h: number;
    change1h: number;
    change24h: number;
    changeBod: number;
    highLeverageFeeExempt: boolean;
    minProvideSize: 0.001;
    type: "future" | "spot";
    underlying?: string;
    enabled: boolean;
    ask: number;
    bid: number;
    last: number;
    postOnly: boolean;
    priceIncrement: number;
    sizeIncrement: number;
    restricted: boolean;
    volumeUsd24h: number;
    largeOrderThreshold: number;
};

type FTXPingRequest = {
    op: "ping";
};

type FTXPongResponse = {
    type: "pong";
};

type FTXSubscribeRequest = {
    op: "subscribe";
    channel: "trades" | "ticker";
    market: string;
};

type FTXSubscribeResponse = {
    type: "subscribed";
    channel: "trades" | "ticker";
    market: string;
};

type FTXTradesUpdate = {
    type: "update";
    channel: "trades";
    market: string;
    data: {
        id: number;
        price: number;
        size: number;
        side: "buy" | "sell";
        liquidation: boolean;
        time: string;
    };
};

type FTXTickerUpdate = {
    type: "update";
    channel: "ticker";
    market: string;
    data: {
        bid: number | null;
        ask: number | null;
        last: number | null;
        time: string;
    };
};

type FTXUnsubscribeRequest = {
    op: "unsubscribe";
    channel: "trades" | "ticker";
    market: string;
};

type FTXUnsubscribeResponse = {
    type: "unsubscribed";
    channel: "trades" | "ticker";
    market: string;
};

export class FTXSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    async inspectURIs(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        context: SourceInspectionContext
    ): Promise<InspectionResults> {
        if (configuration.instance == null) {
            await context.parameterPrompt([
                {
                    type: ParameterType.Select,
                    configuration,
                    name: "instance",
                    message: "Select instance",
                    options: [
                        {
                            title: "ftx.com",
                            value: "ftx.com"
                        },
                        {
                            title: "ftx.us",
                            value: "ftx.us"
                        }
                    ]
                }
            ]);
        }

        if (configuration.markets == null || (configuration.markets as string[]).length === 0) {
            const pairs = await this.getPairs(configuration);

            await context.parameterPrompt([
                {
                    type: ParameterType.AutoCompleteMultiSelect,
                    configuration,
                    name: "markets",
                    message: "Select target pairs",
                    options: pairs.result
                        .filter((pair) => pair.enabled && pair.type === "spot")
                        .map((asset) => {
                            return {
                                title: asset.name,
                                value: asset.name,
                                selected:
                                    configuration.markets == null
                                        ? false
                                        : (configuration.markets as string[]).includes(asset.name)
                            };
                        })
                        .sort((a, b) => {
                            return a.title.localeCompare(b.title);
                        })
                }
            ]);
        }

        return {
            configuration,
            defaultDisplayName: "FTX",
            source: this,
            streamSetPreviews: [
                {
                    slug: "ftx-websocket",
                    configuration,
                    updateHash: new Date().toISOString(),
                    streamSummaries: [
                        {
                            name: "ftx-websocket",
                            updateMethod: UpdateMethod.APPEND_ONLY_LOG,
                            updateHash: new Date().toISOString(),
                            openStream: async () => {
                                const socket = await this.connectSocket(configuration);

                                socket.on("message", (message) => {
                                    const data = JSON.parse(message.toString()) as
                                        | FTXSubscribeResponse
                                        | FTXTradesUpdate
                                        | FTXUnsubscribeResponse
                                        | FTXTickerUpdate;

                                    if (data.type === "update" && data.channel === "ticker") {
                                        const recordContext: RecordContext = {
                                            record: data.data,
                                            schemaSlug: "ticker"
                                        };

                                        stream.push(recordContext);
                                    }

                                    return true;
                                });

                                for (const market of configuration.markets as string[]) {
                                    const subscription: FTXSubscribeRequest = {
                                        op: "subscribe",
                                        channel: "ticker",
                                        market
                                    };

                                    const subscriptionString = JSON.stringify(subscription);

                                    socket.send(subscriptionString);
                                }

                                const stream = new PassThrough({
                                    objectMode: true
                                });

                                const heartBeatInterval = setInterval(() => {
                                    const ping: FTXPingRequest = {
                                        op: "ping"
                                    };
                                    socket.send(JSON.stringify(ping));
                                }, 15000);

                                stream.on("close", () => {
                                    clearInterval(heartBeatInterval);
                                });

                                return {
                                    stream,
                                    transforms: []
                                };
                            }
                        }
                    ]
                }
            ]
        };
    }

    async connectSocket(configuration: DPMConfiguration): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
            let uri = URI;

            if (configuration.instance === "ftx.us") {
                uri = URI_US;
            }

            const websocket = new WebSocket(uri);
            websocket.on("open", () => {
                resolve(websocket);
            });
        });
    }

    async getPairs(configuration: DPMConfiguration): Promise<FtxRestResponse<FtxMarket[]>> {
        let websocketUrl = `https://ftx.com/api/markets`;
        if (configuration.instance === "ftx.us") {
            websocketUrl = `https://ftx.us/api/markets`;
        }

        const response = await fetch(websocketUrl, {
            headers: {
                Accept: "application/json"
            }
        });

        return await response.json();
    }
}
