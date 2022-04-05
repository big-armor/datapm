/* eslint-disable camelcase */
import { DPMConfiguration, ParameterType, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { InspectionResults, Source, SourceInspectionContext } from "../Source";
import { TYPE } from "./KrakenConnectorDescription";
import WebSocket from "ws";
import fetch from "cross-fetch";
import { URI } from "./KrakenConnector";

type KrakenTickerMessage = {
    a: [string, number, string];
    b: [string, number, string];
    c: [string, string];
    v: [number, number];
    p: [number, number];
    t: [number, number];
    l: [number, number];
    h: [number, number];
    o: [number, number];
};

type KrakenTradeMessage = [string, string, string, "b" | "s", "m" | "l", string][];

// https://docs.kraken.com/websockets/#message-spread
type KrakenSpreadMessage = [
    string, // bid
    string, // ask
    string, // timestampe
    string, // bidVolume
    string // askVolume
];

type KrakenMessage = [number, KrakenTickerMessage | KrakenTradeMessage | KrakenSpreadMessage, string, string];

type KrakenResponse<T> = {
    error: string;
    result: T;
};

type KrakenAsset = {
    aclass: string;
    altname: string;
    decimals: number;
    display_decimals: number;
};

type KrakenTradePairs = {
    [key: string]: KrakenTradePair;
};

type KrakenTradePair = {
    altname: string;
    wsname: string;
    alcass_base: string;
    base: string;
    aclass_quote: string;
    quote: string;
    lot: string;
    pair_decimals: number;
    lot_decimasls: number;
    lot_multiplier: number;
    leverage_buy: number[];
    leverage_sell: number[];
    fees: number[];
    fees_maker: number[];
    fee_volume_currency: string;
    margin_call: number;
    margin_stop: number;
    ordermin: string;
};

type KrakenAssets = {
    [key: string]: KrakenAsset;
};

export class KrakenSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    async inspectURIs(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        context: SourceInspectionContext
    ): Promise<InspectionResults> {
        if (configuration.channels == null) {
            await context.parameterPrompt([
                {
                    type: ParameterType.AutoCompleteMultiSelect,
                    configuration,
                    name: "channels",
                    message: "Select channels",
                    options: [
                        {
                            title: "ticker",
                            value: "ticker"
                        },
                        {
                            title: "trade",
                            value: "trade"
                        },
                        {
                            title: "spread",
                            value: "spread"
                        }
                    ]
                }
            ]);
        }

        if (configuration.products == null || (configuration.products as string[]).length === 0) {
            const pairs = await this.getPairs();

            await context.parameterPrompt([
                {
                    type: ParameterType.AutoCompleteMultiSelect,
                    configuration,
                    name: "products",
                    message: "Select target pairs",
                    options: Object.keys(pairs.result)
                        .map((assetName) => {
                            const asset = pairs.result[assetName];
                            return {
                                title: asset.wsname,
                                value: asset.wsname,
                                selected:
                                    configuration.products == null
                                        ? false
                                        : (configuration.products as string[]).includes(asset.wsname)
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
            defaultDisplayName: "Kraken",
            source: this,
            streamSetPreviews: [
                {
                    slug: "kraken-websocket",
                    configuration,
                    updateHash: new Date().toISOString(),
                    streamSummaries: [
                        {
                            name: "kraken-websocket",
                            updateMethod: UpdateMethod.CONTINUOUS,
                            updateHash: new Date().toISOString(),
                            openStream: async () => {
                                const socket = await this.connectSocket();

                                for (const channel of configuration.channels as string[]) {
                                    const subscriptionString = JSON.stringify({
                                        event: "subscribe",
                                        pair: configuration.products as string[],
                                        subscription: {
                                            name: channel
                                        }
                                    });

                                    socket.send(subscriptionString);
                                }

                                const stream = new PassThrough({
                                    objectMode: true
                                });

                                socket.on("close", () => {
                                    stream.end();
                                });

                                socket.on("message", (message) => {
                                    const messageObject = JSON.parse(message.toString()) as KrakenMessage;

                                    if (messageObject[2] === "ticker") {
                                        const tickerData = messageObject[1] as KrakenTickerMessage;

                                        const recordContext: RecordContext = {
                                            record: {
                                                pair: messageObject[3],
                                                ask_price: tickerData.a[0],
                                                ask_whole_lot_volume: tickerData.a[1],
                                                ask_lot_volume: tickerData.a[2],
                                                bid_price: tickerData.b[0],
                                                bid_whole_lot_volume: tickerData.b[1],
                                                bid_lot_volume: tickerData.b[2],
                                                close_price: tickerData.c[0],
                                                close_lot_volume: tickerData.c[1],
                                                volume_today: tickerData.v[0],
                                                volume_last_24_hours: tickerData.v[1],
                                                weighted_average_price: tickerData.p[0],
                                                weighted_average_last_24_hours: tickerData.p[1],
                                                trades_today: tickerData.t[0],
                                                trades_last_24_hours: tickerData.t[1],
                                                low_today: tickerData.l[0],
                                                low_last_24_hours: tickerData.l[1],
                                                high_today: tickerData.h[0],
                                                high_last_24_hours: tickerData.h[1],
                                                open_price: tickerData.o[0],
                                                open_last_24_hours: tickerData.o[1]
                                            },
                                            schemaSlug: "ticker"
                                        };
                                        stream.push(recordContext);
                                    } else if (messageObject[2] === "trade") {
                                        const tradeData = messageObject[1] as KrakenTradeMessage;

                                        const recordContexts = tradeData.map<RecordContext>((t) => {
                                            return {
                                                schemaSlug: "trade",
                                                record: {
                                                    pair: messageObject[3],
                                                    price: t[0],
                                                    volume: t[1],
                                                    time: t[2],
                                                    side: t[3],
                                                    orderType: t[4],
                                                    misc: t[5]
                                                }
                                            };
                                        });

                                        stream.push(recordContexts);
                                    } else if (messageObject[2] === "spread") {
                                        const spreadData = messageObject[1] as KrakenSpreadMessage;
                                        const recordContext: RecordContext = {
                                            schemaSlug: "spread",
                                            record: {
                                                bid: spreadData[0],
                                                ask: spreadData[1],
                                                timestamp: spreadData[2],
                                                bidVolume: spreadData[3],
                                                askVolume: spreadData[4]
                                            }
                                        };

                                        stream.push(recordContext);
                                    }
                                    return true;
                                });

                                stream.on("close", () => {
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

    async connectSocket(): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
            const websocket = new WebSocket(URI);
            websocket.on("open", () => {
                resolve(websocket);
            });
            websocket.on("ping", () => {
                websocket.pong();
            });
        });
    }

    async getPairs(): Promise<KrakenResponse<KrakenTradePairs>> {
        const response = await fetch(`https://api.kraken.com/0/public/AssetPairs`, {
            headers: {
                Accept: "application/json"
            }
        });

        return await response.json();
    }
}
