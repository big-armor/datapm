/* eslint-disable camelcase */
import { DPMConfiguration, ParameterType, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { InspectionResults, Source } from "../Source";
import { TYPE } from "./FTXConnectorDescription";
import WebSocket from "ws";
import fetch from "cross-fetch";
import { getWebSocketUri } from "./FTXConnector";
import { JobContext } from "../../task/JobContext";

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

    async inspectData(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<InspectionResults> {
        if (configuration.channels == null) {
            await jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoCompleteMultiSelect,
                    name: "channels",
                    message: "Select channels",
                    configuration,
                    options: [
                        {
                            title: "trades",
                            value: "trades"
                        },
                        {
                            title: "ticker",
                            value: "ticker"
                        }
                    ]
                }
            ]);
        }

        if (configuration.markets == null || (configuration.markets as string[]).length === 0) {
            const pairs = await this.getPairs(configuration);

            await jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoCompleteMultiSelect,
                    configuration,
                    name: "markets",
                    message: "Select target pairs",
                    multiSelectMinimumCount: 1,
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
                    updateHash: new Date().toISOString(),
                    streamSummaries: [
                        {
                            name: "ftx-websocket",
                            updateMethod: UpdateMethod.CONTINUOUS,
                            updateHash: new Date().toISOString(),
                            openStream: async () => {
                                const socket = await this.connectSocket(connectionConfiguration);

                                socket.on("message", (message) => {
                                    const data = JSON.parse(message.toString()) as
                                        | FTXSubscribeResponse
                                        | FTXTradesUpdate
                                        | FTXUnsubscribeResponse
                                        | FTXTickerUpdate;

                                    if (
                                        data.type === "update" &&
                                        (data.channel === "ticker" || data.channel === "trades")
                                    ) {
                                        if (Array.isArray(data.data)) {
                                            for (const item of data.data) {
                                                const recordContext: RecordContext = {
                                                    record: {
                                                        ...item,
                                                        market: data.market
                                                    },
                                                    schemaSlug: data.channel
                                                };

                                                stream.push(recordContext);
                                            }
                                        } else {
                                            const recordContext: RecordContext = {
                                                record: {
                                                    ...data.data,
                                                    market: data.market
                                                },
                                                schemaSlug: data.channel
                                            };

                                            stream.push(recordContext);
                                        }
                                    }

                                    return true;
                                });

                                for (const market of configuration.markets as string[]) {
                                    for (const channel of configuration.channels as string[]) {
                                        const subscription: FTXSubscribeRequest = {
                                            op: "subscribe",
                                            channel: channel as "trades" | "ticker",
                                            market
                                        };

                                        const subscriptionString = JSON.stringify(subscription);

                                        socket.send(subscriptionString);
                                    }
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

                                    const closableStates: number[] = [WebSocket.OPEN, WebSocket.CONNECTING];
                                    if (closableStates.includes(socket.readyState)) socket.close();
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

    async connectSocket(connectionConfiguration: DPMConfiguration): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
            const uri = getWebSocketUri(connectionConfiguration);

            const websocket = new WebSocket(uri);
            websocket.on("open", () => {
                resolve(websocket);
            });
            websocket.on("ping", () => {
                websocket.pong();
            });
        });
    }

    async getPairs(connectionConfiguration: DPMConfiguration): Promise<FtxRestResponse<FtxMarket[]>> {
        let marketsUrl = `https://ftx.com/api/markets`;
        if (connectionConfiguration.instance === "ftx.us") {
            marketsUrl = `https://ftx.us/api/markets`;
        }

        const response = await fetch(marketsUrl, {
            headers: {
                Accept: "application/json"
            }
        });

        return await response.json();
    }
}
