/* eslint-disable camelcase */
import { DPMConfiguration, ParameterType, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { InspectionResults, Source } from "../Source";
import { TYPE, URI_BASE } from "./GeminiConnectorDescription";
import WebSocket from "ws";
import fetch from "cross-fetch";
import { JobContext } from "../../task/Task";
import { Update } from "aws-sdk/clients/dynamodb";

type ChangeEvent = {
    type: "change";
    side: "bid" | "ask";
    reason: "place" | "trade" | "cancel" | "initial";
    remaining: string;
    delta: string;
};

// https://docs.gemini.com/websocket-api/?shell#trade-event
type TradeEvent = {
    type: "trade";
    amount: string;
    makerSide: "bid" | "ask" | "auction";
};

type BlockTradeEvent = {
    type: "block_trade";
    tid: number;
    price: string;
    amount: string;
};

type AuctionOpenEvent = {
    type: "auction_open";
    auction_open_ms: number;
    auction_time_ms: number;
    first_indicative_ms: number;
    last_cancel_time_ms: number;
};

type AuctionIndicativeEvent = {
    type: "auction_indicative";
    eid: number;
    result: "success" | "failure";
    time_ms: number;
    highest_bid_price: string;
    lowest_ask_price: string;
    collar_price: string;
    indicative_price: string;
    indicative_quantity: string;
};

type AuctionOutcomeEvent = {
    type: "auction_result";
    eid: number;
    result: "success" | "failure";
    time_ms: number;
    highest_bid_price: string;
    lowest_ask_price: string;
    collar_price: string;
    auction_price: string;
    auction_quantity: string;
};

type UpdateMessage = {
    type: "update";
    eventId: number;
    timestamp: number;
    timestampms: number;
    socket_sequence: number;
    events: (
        | ChangeEvent
        | TradeEvent
        | BlockTradeEvent
        | AuctionIndicativeEvent
        | AuctionOpenEvent
        | AuctionOutcomeEvent
    )[];
};

type GeminiSymbols = string[];

export class GeminiSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    async inspectData(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<InspectionResults> {
        if (configuration.events == null) {
            await jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoCompleteMultiSelect,
                    configuration,
                    name: "events",
                    message: "Select events",
                    validate: (value) => {
                        if ((value as string[]).length === 0) {
                            return "You must select at least one event";
                        }

                        return true;
                    },
                    options: [
                        {
                            title: "ticker", // not calling it changes, because it's confusingly named
                            value: "ticker"
                        },
                        {
                            title: "trades",
                            value: "trades"
                        },
                        {
                            title: "auction",
                            value: "auction"
                        }
                    ]
                }
            ]);
        }

        if (configuration.symbols == null || (configuration.symbols as string[]).length === 0) {
            const pairs = await this.getPairs();

            await jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoCompleteMultiSelect,
                    configuration,
                    name: "symbols",
                    message: "Select target pairs (symbols)",
                    options: pairs
                        .map((p) => {
                            return {
                                title: p,
                                value: p,
                                selected:
                                    configuration.products == null
                                        ? false
                                        : (configuration.products as string[]).includes(p)
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
            defaultDisplayName: "Gemini",
            source: this,
            streamSetPreviews: [
                {
                    slug: "gemini-websocket",
                    updateHash: new Date().toISOString(),
                    streamSummaries: [
                        {
                            name: "gemini-websocket",
                            updateMethod: UpdateMethod.CONTINUOUS,
                            updateHash: new Date().toISOString(),
                            openStream: async () => {
                                const stream = new PassThrough({
                                    objectMode: true
                                });

                                const sockets: WebSocket[] = [];

                                for (const symbol of configuration.symbols as string[]) {
                                    const socket = await this.connectSocket(symbol, configuration);

                                    sockets.push(socket);

                                    socket.on("close", () => {
                                        stream.end();
                                    });

                                    socket.on("message", (message) => {
                                        const data = JSON.parse(message.toString()) as UpdateMessage;

                                        if (data.type !== "update") {
                                            return true;
                                        }

                                        const recordContexts: RecordContext[] = [];

                                        for (const event of data.events) {
                                            let eventData: any;

                                            if (event.type === "change") {
                                                eventData = {
                                                    ...event,
                                                    type: "ticker"
                                                };
                                            } else {
                                                eventData = event;
                                            }

                                            eventData.symbol = symbol;

                                            const recordContext: RecordContext = {
                                                record: eventData,
                                                schemaSlug: eventData.type
                                            };

                                            delete eventData.type;

                                            recordContexts.push(recordContext);
                                        }

                                        stream.push(recordContexts);

                                        return true;
                                    });
                                }

                                stream.on("close", () => {
                                    for (const socket of sockets) {
                                        const closableStates: number[] = [WebSocket.OPEN, WebSocket.CONNECTING];
                                        if (closableStates.includes(socket.readyState)) socket.close();
                                    }
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

    async connectSocket(symbols: string, configuration: DPMConfiguration): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
            const queryOptions: string[] = [];

            const events = configuration.events as string[];

            if (events.includes("ticker")) {
                queryOptions.push("top_of_book=true");
                queryOptions.push("bids=true");
                queryOptions.push("offers=true");
            } else {
                queryOptions.push("top_of_book=true");
                queryOptions.push("bids=false");
                queryOptions.push("offers=false");
            }

            if (events.includes("trades")) {
                queryOptions.push("trades=true");
            } else {
                queryOptions.push("trades=false");
            }

            if (events.includes("auctions")) {
                queryOptions.push("auctions=true");
            } else {
                queryOptions.push("auctions=false");
            }

            const websocket = new WebSocket(URI_BASE + symbols + "?" + queryOptions.join("&"));
            websocket.on("open", () => {
                resolve(websocket);
            });
            websocket.on("ping", () => {
                websocket.pong();
            });
        });
    }

    async getPairs(): Promise<GeminiSymbols> {
        const response = await fetch(`https://api.gemini.com/v1/symbols`, {
            headers: {
                Accept: "application/json"
            }
        });

        return await response.json();
    }
}
