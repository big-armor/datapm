/* eslint-disable camelcase */
import { DPMConfiguration, ParameterType, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { InspectionResults, Source, SourceInspectionContext } from "../Source";
import { TYPE } from "./KrakenConnectorDescription";
import { URI } from "./KrakenSourceDescription";
import WebSocket from "ws";
import fetch from "cross-fetch";
import { integer } from "aws-sdk/clients/cloudfront";

type KrakenTickerMessage = {
    a: [string, number, string];
    b: [string, number, string];
    c: [string, string];
    v: [number, number];
    p: [number, number];
    t: [integer, integer];
    l: [number, number];
    h: [number, number];
    o: [number, number];
};

type KrakenMessage = [number, KrakenTickerMessage, string, string];

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
                            updateMethod: UpdateMethod.APPEND_ONLY_LOG,
                            updateHash: new Date().toISOString(),
                            openStream: async () => {
                                const socket = await this.connectSocket();

                                const subscriptionString = JSON.stringify({
                                    event: "subscribe",
                                    pair: configuration.products as string[],
                                    subscription: {
                                        name: "ticker"
                                    }
                                });

                                socket.send(subscriptionString);

                                const stream = new PassThrough({
                                    objectMode: true
                                });

                                socket.on("message", (message) => {
                                    const data = JSON.parse(message.toString()) as KrakenMessage;

                                    if (data[2] === "ticker") {
                                        const recordContext: RecordContext = {
                                            record: {
                                                pair: data[3],
                                                ask_price: data[1].a[0],
                                                ask_whole_lot_volume: data[1].a[1],
                                                ask_lot_volume: data[1].a[2],
                                                bid_price: data[1].b[0],
                                                bid_whole_lot_volume: data[1].b[1],
                                                bid_lot_volume: data[1].b[2],
                                                close_price: data[1].c[0],
                                                close_lot_volume: data[1].c[1],
                                                volume_today: data[1].v[0],
                                                volume_last_24_hours: data[1].v[1],
                                                weighted_average_price: data[1].p[0],
                                                weighted_average_last_24_hours: data[1].p[1],
                                                trades_today: data[1].t[0],
                                                trades_last_24_hours: data[1].t[1],
                                                low_today: data[1].l[0],
                                                low_last_24_hours: data[1].l[1],
                                                high_today: data[1].h[0],
                                                high_last_24_hours: data[1].h[1],
                                                open_price: data[1].o[0],
                                                open_last_24_hours: data[1].o[1]
                                            },
                                            schemaSlug: "ticker"
                                        };
                                        stream.push(recordContext);
                                    }
                                    return true;
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
