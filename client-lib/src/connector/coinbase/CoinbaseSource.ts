/* eslint-disable camelcase */
import { DPMConfiguration, ParameterType, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { InspectionResults, Source, SourceInspectionContext } from "../Source";
import { TYPE } from "./CoinbaseConnectorDescription";
import { URI } from "./CoinbaseSourceDescription";
import WebSocket from "ws";
import fetch from "cross-fetch";

type SubscriptionsMessage = {
    type: "subscriptions";
    channels: {
        name: string;
        product_ids: string[];
    }[];
};

type MatchMessage = {
    type: "last_match" | "match";
    trade_id: number;
    sequence: number;
    maker_order_id: string;
    taker_order_id: string;
    time: string;
    product_id: string;
    size: string;
    price: string;
    side: "buy" | "sell";
};

type TickerMessage = {
    type: "ticker";
    sequence: number;
    product_id: string;
    price: string;
    open_24h: string;
    volume_24h: string;
    low_24h: string;
    high_24h: string;
    volume_30d: string;
    best_bid: string;
    best_ask: string;
    side: "buy" | "sell";
    time: string;
    trade_id: number;
    last_size: string;
};

type CoinbaseProduct = {
    id: string;
    base_currency: string;
    quote_currency: string;
    base_min_size: string;
    base_max_size: string;
    quote_increment: string;
    base_increment: string;
    display_name: string;
    min_market_funds: string;
    max_market_funds: string;
    margin_enabled: boolean;
    post_only: boolean;
    limit_only: boolean;
    cancel_only: boolean;
    status: string;
    status_message: string;
    trading_disabled: boolean;
    fx_stablecoin: boolean;
    max_slippage_percentage: string;
    auction_mode: boolean;
};

export class CoinbaseSource implements Source {
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
                    validate: (value) => {
                        if ((value as string[]).length === 0) {
                            return "You must select at least one channel";
                        }

                        return true;
                    },
                    options: [
                        {
                            title: "matches",
                            value: "matches"
                        },
                        {
                            title: "ticker",
                            value: "ticker"
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
                    options: pairs
                        .map((p) => {
                            return {
                                title: p.display_name,
                                value: p.id,
                                selected:
                                    configuration.products == null
                                        ? false
                                        : (configuration.products as string[]).includes(p.id)
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
            defaultDisplayName: "Coinbase",
            source: this,
            streamSetPreviews: [
                {
                    slug: "coinbase-websocket",
                    configuration,
                    updateHash: new Date().toISOString(),
                    streamSummaries: [
                        {
                            name: "coinbase-websocket",
                            updateMethod: UpdateMethod.APPEND_ONLY_LOG,
                            updateHash: new Date().toISOString(),
                            openStream: async () => {
                                const socket = await this.connectSocket();

                                const subscriptionString = JSON.stringify({
                                    type: "subscribe",
                                    product_ids: configuration.products as string[],
                                    channels: configuration.channels
                                });

                                socket.send(subscriptionString);

                                const stream = new PassThrough({
                                    objectMode: true
                                });

                                socket.on("close", () => {
                                    stream.end();
                                });

                                socket.on("message", (message) => {
                                    const data = JSON.parse(message.toString()) as
                                        | SubscriptionsMessage
                                        | TickerMessage
                                        | MatchMessage;

                                    if (data.type === "subscriptions") {
                                        return true;
                                    }

                                    if (data.type === "ticker") {
                                        const recordContext: RecordContext = {
                                            record: data,
                                            schemaSlug: "ticker"
                                        };
                                        stream.push(recordContext);
                                    }

                                    if (data.type === "last_match" || data.type === "match") {
                                        const recordContext: RecordContext = {
                                            record: data,
                                            schemaSlug: "match"
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
            websocket.on("ping", () => {
                websocket.pong();
            });
        });
    }

    async getPairs(): Promise<CoinbaseProduct[]> {
        const response = await fetch(`https://api.exchange.coinbase.com/products`, {
            headers: {
                Accept: "application/json"
            }
        });

        return await response.json();
    }
}
