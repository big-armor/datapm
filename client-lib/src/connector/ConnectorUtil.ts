import { BigQueryConnectorDescription } from "./database/big-query/BigQueryConnectorDescription";
import { MongoRepositoryDescripton } from "./database/mongo/MongoConnectorDescription";
import { MySqlConnectorDescription } from "./database/mysql/MySqlConnectorDescription";
import { PostgresConnectorDescription } from "./database/postgres/PostgresConnectorDescription";
import { RedshiftConnectorDescription } from "./database/redshift/RedshiftConnectorDescription";
import { GoogleSheetConnectorDescription } from "./file-based/google-sheet/GoogleSheetConnectorDescription";
import { HTTPConnectorDescription } from "./file-based/http/HTTPConnectorDescription";
import { LocalFileConnectorDescription } from "./file-based/local-file/LocalFileConnectorDescription";
import { StandardOutConnectorDescription } from "./file-based/standard-out/StandardOutConnectorDescription";
import { ConnectorDescription } from "./Connector";
import { StreamTestConnectorDescription } from "./stream/test/StreamTestConnectorDescription";
import { DataPMConnectorDescription } from "./file-based/datapm-registry/DataPMConnectorDescription";
import { DecodableConnectorDescription } from "./decodable/DecodableConnectorDescription";
import { CoinbaseConnectorDescription } from "./coinbase/CoinbaseConnectorDescription";
import { KrakenConnectorDescription } from "./kraken/KrakenConnectorDescription";
import { FTXConnectorDescription } from "./ftx/FTXConnectorDescription";
import { BinanceConnectorDescription } from "./binance/BinanceConnectorDescription";
import { KafkaConnectorDescription } from "./stream/kafka/KafkaConnectorDescription";
import { GeminiConnectorDescription } from "./gemini/GeminiConnectorDescription";
import { TimeplusConnectorDescription } from "./timeplus/TimeplusConnectorDescription";
import { TwitterConnectorDescription } from "./twitter/TwitterConnectorDescription";
import { EventSourceConnectorDescription } from "./event-source/EventSourceConnectorDescription";

export const CONNECTORS: ConnectorDescription[] = [
    new BigQueryConnectorDescription(),
    new MongoRepositoryDescripton(),
    new MySqlConnectorDescription(),
    new PostgresConnectorDescription(),
    new RedshiftConnectorDescription(),
    new GoogleSheetConnectorDescription(),
    new StandardOutConnectorDescription(),
    new DecodableConnectorDescription(),
    new CoinbaseConnectorDescription(),
    new TwitterConnectorDescription(),
    new EventSourceConnectorDescription(),
    new KrakenConnectorDescription(),
    new FTXConnectorDescription(),
    new BinanceConnectorDescription(),
    new KafkaConnectorDescription(),
    new GeminiConnectorDescription(),
    new TimeplusConnectorDescription(),

    // These generic file-based connectors should always be at the bottom of the list
    // so that more specific services are tried first during the "supportsUrl"
    // checks

    new HTTPConnectorDescription(),
    new LocalFileConnectorDescription()
];

/** These are never presented to the user as an option, but are available if the user knows they exist.
 * This can be used for hiding 'test' and depreciated implementations */
export const EXTENDED_CONNECTORS: ConnectorDescription[] = CONNECTORS.concat([
    new StreamTestConnectorDescription(),
    new DataPMConnectorDescription()
]);

export function getConnectorDescriptions(): ConnectorDescription[] {
    return CONNECTORS.sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()));
}

export function getConnectorDescriptionByType(type: string): ConnectorDescription | undefined {
    return EXTENDED_CONNECTORS.find((r) => r.getType() === type);
}
