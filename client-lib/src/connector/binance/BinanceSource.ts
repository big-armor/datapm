/* eslint-disable camelcase */
import { DPMConfiguration, ParameterType, RecordContext, UpdateMethod } from "datapm-lib";
import { PassThrough } from "stream";
import { InspectionResults, Source } from "../Source";
import { TYPE } from "./BinanceConnectorDescription";
import WebSocket from "ws";
import fetch from "cross-fetch";
import { JobContext } from "../../task/Task";
import { getWebSocketUri } from "./BinanceConnector";

type BinanceSymbol = {
    symbol: string;
    status: "TRADING";
    baseAsset: string;
    baseAssetPrecision: number;
    quoteAsset: string;
    quotePrecision: number; // "will be removed in future api version v4+"
    quoteAssetPrecision: number;
    baseCommissionPrecision: number;
    quoteCommissionPrecision: number;
    orderTypes: (
        | "LIMIT"
        | "LIMIT_MAKER"
        | "MARKET"
        | "STOP_LOSS"
        | "STOP_LOSS_LIMIT"
        | "TAKE_PROFIT"
        | "TAKE_PROFIT_LIMIT"
    )[];
    icebergAllowed: boolean;
    ocoAllowed: boolean;
    quoteOrderQtyMarketAllowed: boolean;
    allowTrailingStop: boolean;
    isSpotTradingAllowed: boolean;
    isMarginTradingAllowed: boolean;
    filters: unknown[];
    permissions: ("SPOT" | "MARGIN")[];
};

type BinanceExchangeInfoResponse = {
    timezone: string;
    serverTime: number;
    rateLimits: unknown[];
    exchangeFilters: unknown[];
    symbols: BinanceSymbol[];
};

type BinanceEvent = {
    e: "24hrMiniTicker";
};

type BinanceMiniTickerEvent = {
    e: "24hrMiniTicker";
    E: number;
    s: string;
    c: string;
    o: string;
    h: string;
    l: string;
    v: string;
    q: string;
};

type BinanceTickerEvent = {
    e: "24hrTicker";
    E: number; // event time
    s: string; // symbol
    p: string; // price
    P: string; // price change percent
    w: string; // Weighted average price
    x: string; // First trade(F)-1 price (First trade before the 24hr rolling window)
    c: string; // Last price
    Q: string; // Last quantity
    b: string; // Best bid price
    B: string; // Best bid quantity
    a: string; // Best ask price
    A: string; // Best ask quantity
    o: string; // Open price
    h: string; // High price
    l: string; // Low price
    v: string; // Total traded base asset volume
    q: string; // Total traded quote asset volume
    O: number; // Statistics Open time
    C: number; // Statistics Close time
    F: number; // First trade ID
    L: number; // Last trade Id
    n: number; // Total number of trades
};

type BinanceBookTickerEvent = {
    u: number; // order book updateId
    s: string; // symbol
    b: string; // best bid price
    B: string; // best bid quantity
    a: string; // best ask price
    A: string; // best ask quantity
};

type BinanceSubscribeRequestResult = {
    id: number; // message id
    result: string[] | null;
};

type BinanceStreamEvent<T> = {
    stream: string;
    data: T;
};

export class BinanceSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    async inspectData(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<InspectionResults> {
        if (configuration.channelType == null) {
            await jobContext.parameterPrompt([
                {
                    type: ParameterType.Select,
                    configuration,
                    name: "channelType",
                    message: "Select channel",
                    options: [
                        {
                            title: "Book ticker, real-time updates",
                            value: "bookTicker"
                        },
                        {
                            title: "24hr ticker, once per second",
                            value: "ticker"
                        },
                        {
                            title: "24hr mini ticker, once per second",
                            value: "miniTicker"
                        }
                    ]
                }
            ]);
        }

        if (configuration.pairs == null || (configuration.pairs as string[]).length === 0) {
            const pairs = await this.getPairs(jobContext, connectionConfiguration);

            await jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoCompleteMultiSelect,
                    configuration,
                    name: "pairs",
                    message: "Select target pairs",
                    multiSelectMinimumCount: 1,
                    options: pairs
                        .filter((p) => p.status === "TRADING")
                        .map((pair) => {
                            return {
                                title: pair.baseAsset + "/" + pair.quoteAsset,
                                value: pair.symbol,
                                selected:
                                    configuration.pairs == null
                                        ? false
                                        : (configuration.pairs as string[]).includes(pair.symbol)
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
            defaultDisplayName: "Binance",
            source: this,
            streamSetPreviews: [
                {
                    slug: "binance-websocket",
                    updateHash: new Date().toISOString(),
                    streamSummaries: [
                        {
                            name: "binance-websocket",
                            updateMethod: UpdateMethod.CONTINUOUS,
                            updateHash: new Date().toISOString(),
                            openStream: async () => {
                                const socket = await this.connectSocket(configuration);

                                const messageId = 1;

                                const stream = new PassThrough({
                                    objectMode: true
                                });

                                socket.on("close", () => {
                                    stream.end();
                                });

                                socket.on("message", (message) => {
                                    const messageObject = JSON.parse(message.toString()) as BinanceStreamEvent<
                                        BinanceBookTickerEvent | BinanceMiniTickerEvent | BinanceTickerEvent
                                    >;

                                    if ((messageObject.data as BinanceTickerEvent).e === "24hrTicker") {
                                        const event = messageObject.data as BinanceTickerEvent;

                                        const data = {
                                            eventType: event.e,
                                            eventTime: event.E,
                                            symbol: event.s,
                                            priceChange: event.p,
                                            priceChangePercent: event.P,
                                            weightedAveragePrice: event.w,
                                            firstTradePrice: event.x,
                                            lastPrice: event.c,
                                            lastQty: event.Q,
                                            bestBidPrice: event.b,
                                            bestAskPrice: event.a,
                                            bestAskQty: event.A,
                                            openPrice: event.o,
                                            highPrice: event.h,
                                            lowPrice: event.l,
                                            baseAssetVolume: event.v,
                                            quoteAssetVolume: event.q,
                                            openTime: event.O,
                                            closeTime: event.C,
                                            firstTradeId: event.F,
                                            lastTradeId: event.L,
                                            numTrades: event.n
                                        };

                                        const recordContext: RecordContext = {
                                            record: data,
                                            schemaSlug: event.e
                                        };

                                        stream.write(recordContext);
                                    } else if ((messageObject.data as BinanceMiniTickerEvent).e === "24hrMiniTicker") {
                                        const event = messageObject.data as BinanceMiniTickerEvent;

                                        const data = {
                                            eventType: event.e,
                                            eventTime: event.E,
                                            symbol: event.s,
                                            closePrice: event.c,
                                            openPrice: event.o,
                                            highPrice: event.h,
                                            lowPrice: event.l,
                                            baseAssetVolume24hr: event.v,
                                            quoteAssetVolume24hr: event.q
                                        };

                                        const recordContext: RecordContext = {
                                            record: data,
                                            schemaSlug: event.e
                                        };

                                        stream.write(recordContext);
                                    } else if (configuration.channelType === "bookTicker") {
                                        const event = messageObject.data as BinanceBookTickerEvent;

                                        const data = {
                                            orderBookUpdateId: event.u,
                                            symbol: event.s,
                                            bestBidPrice: event.b,
                                            bestBidQty: event.B,
                                            bestAskPrice: event.a,
                                            bestAskQty: event.A
                                        };

                                        const recordContext: RecordContext = {
                                            record: data,
                                            schemaSlug: "bookTicker"
                                        };

                                        stream.write(recordContext);
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

    async connectSocket(configuration: DPMConfiguration): Promise<WebSocket> {
        let webSocketUri = getWebSocketUri(configuration);

        webSocketUri +=
            "?streams=" +
            (configuration.pairs as string[]).map((p) => p.toLowerCase() + "@" + configuration.channelType).join("/");

        return new Promise((resolve, reject) => {
            const websocket = new WebSocket(webSocketUri);
            websocket.on("open", () => {
                resolve(websocket);
            });
            websocket.on("error", (error) => {
                reject(error);
            });
            websocket.on("ping", () => {
                websocket.pong();
            });
        });
    }

    async getPairs(jobContext: JobContext, connectionConfiguration: DPMConfiguration): Promise<BinanceSymbol[]> {
        const task = await jobContext.startTask("Retreiving available trading pairs");

        let uri = "https://api.binance.com";

        if (connectionConfiguration.instance === "binance.us") {
            uri = "https://api.binance.us";
        }

        const response = await fetch(uri + `/api/v3/exchangeInfo`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            task.end("ERROR", "There was an error retrieving the trading pairs: " + response.statusText);
            throw new Error("There was an error retrieving the trading pairs: " + response.statusText);
        }

        task.setMessage("Parsing trading pairs");

        const exchangeInfo = (await response.json()) as BinanceExchangeInfoResponse;

        task.end("SUCCESS", "Found " + exchangeInfo.symbols.length + " trading pairs");

        return exchangeInfo.symbols;
    }
}
