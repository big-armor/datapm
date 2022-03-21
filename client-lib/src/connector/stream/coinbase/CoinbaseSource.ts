/* eslint-disable camelcase */
import { DPMConfiguration, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { InspectionResults, Source, SourceInspectionContext } from "../../Source";
import { TYPE } from "./CoinbaseConnectorDescription";
import { URI } from "./CoinbaseSourceDescription";
import WebSocket from "ws";

type SubscriptionsMessage = {
    type: "subscriptions";
    channels: {
        name: string;
        product_ids: string[];
    }[];
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
                                    product_ids: ["ETH-USD", "ETH-EUR"],
                                    channels: [
                                        {
                                            name: "ticker",
                                            product_ids: ["ETH-BTC", "ETH-USD"]
                                        }
                                    ]
                                });

                                socket.send(subscriptionString);

                                const stream = new PassThrough({
                                    objectMode: true
                                });

                                socket.on("message", (message) => {
                                    const data = JSON.parse(message.toString()) as SubscriptionsMessage | TickerMessage;

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
}
