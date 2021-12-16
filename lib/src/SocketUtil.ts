import { SchemaIdentifier } from "./main";
import { StreamIdentifier } from "./PackageFile-v0.7.0";
import { DPMRecord } from "./PackageUtil";

/** This identifiest a single batch upload (which can be a series of appended streams) to the
 * data registry service. This class is in SocketUtil.ts because it is specifically not part of the
 * PackageFile specification - which does not include the concept of batches.
 *
 * A "batch" is like a version number on an upload of a stream. Clients can choose to upload a new batch (even
 * over a very long period of time), or start a new batch and append to it. The term version was not used
 * because that is reserved for the package version number. A batch is related to one major version of a package.
 */
export interface BatchIdentifier extends StreamIdentifier {
    batch: number;
}

/**
 * TOP LEVEL EVENTS - These are generally sent by the client to
 * request that the server start a process. Process specific events
 * and interfaces are below.
 */

export enum SocketEvent {
    READY = "ready",
    OPEN_FETCH_CHANNEL = "openFetchChannel",
    START_DATA_UPLOAD = "uploadDataRequest",
    SET_STREAM_ACTIVE_BATCHES = "setStreamActiveBatchesRequest",
    SCHEMA_INFO_REQUEST = "schemaInfoRequest"
}

export enum SocketError {
    NOT_AUTHORIZED = "notAuthorized",
    NOT_FOUND = "notFound",
    NOT_VALID = "notValid",
    STREAM_LOCKED = "streamLocked",
    SERVER_ERROR = "serverError",
    NOT_STARTED = "streamProcessNotStarted" // generic error for "you forgot to send a request to do something"
}

export enum SocketResponseType {
    ERROR = "error",
    SCHEMA_INFO_RESPONSE = "schemaInfoResponse",
    START_DATA_UPLOAD_RESPONSE = "startDataUploadResponse",
    SET_STREAM_ACTIVE_BATCHES = "setStreamActiveBatchesResponse",
    OPEN_FETCH_CHANNEL_RESPONSE = "openFetchChannelResponse"
}

export interface Request {
    requestType: SocketEvent;
}

export interface Response {
    responseType: SocketResponseType;
}

/** Error handling */
export class ErrorResponse implements Response {
    responseType = SocketResponseType.ERROR;

    // eslint-disable-next-line no-useless-constructor
    constructor(public message: string, public errorType: SocketError) {}
}

/** STREAM INFO  */

/** Sent by the client to request information about a given stream */
export class SchemaInfoRequest implements Request {
    requestType = SocketEvent.SCHEMA_INFO_REQUEST;

    // eslint-disable-next-line no-useless-constructor
    constructor(public identifier: SchemaIdentifier) {}
}

export class SchemaInfoResponse implements Response {
    responseType = SocketResponseType.SCHEMA_INFO_RESPONSE;

    // eslint-disable-next-line no-useless-constructor
    constructor(
        public identifier: SchemaIdentifier,
        public streams: {
            batchIdentifier: BatchIdentifier;
            highestOffset: number;
        }[]
    ) {}
}

/** Sent by the client to set the batches for given streams. All done in a transaction, so that other
 * clients get lists of compatible streams
 */
export class SetStreamActiveBatchesRequest implements Request {
    requestType = SocketEvent.SET_STREAM_ACTIVE_BATCHES;

    // eslint-disable-next-line no-useless-constructor
    constructor(public batchIdentifiers: BatchIdentifier[]) {}
}

export class SetStreamActiveBatchesResponse implements Response {
    responseType = SocketResponseType.SET_STREAM_ACTIVE_BATCHES;

    // eslint-disable-next-line no-useless-constructor
    constructor(public batchIdentifiers: BatchIdentifier[]) {}
}

/**
 * DATA UPLOADS
 */

export enum UploadRequestType {
    UPLOAD_DATA = "uploadData",
    UPLOAD_STOP = "uploadStop"
}

export enum UploadResponseType {
    UPLOAD_RESPONSE = "uploadResponse",
    UPLOAD_STOP_RESPONSE = "uploadStopResponse"
}

export interface UploadRequest {
    requestType: UploadRequestType;
}

export interface UploadResponse {
    responseType: UploadResponseType;
}

/** This is sent on the SocketEvent.UPLOAD_DATA channel */
export class StartUploadRequest implements Request {
    requestType = SocketEvent.START_DATA_UPLOAD;

    // eslint-disable-next-line no-useless-constructor
    constructor(public streamIdentifier: StreamIdentifier, public newBatch: boolean) {}
}

/** This is sent by the server in response to the StreamUploadRequest */
export class StartUploadResponse implements Response {
    responseType = SocketResponseType.START_DATA_UPLOAD_RESPONSE;

    // eslint-disable-next-line no-useless-constructor
    constructor(public channelName: string, public batchIdentifier: BatchIdentifier) {}
}

/** Sent by the client to the server to upload data.  */
export class UploadDataRequest implements UploadRequest {
    requestType = UploadRequestType.UPLOAD_DATA;

    // eslint-disable-next-line no-useless-constructor
    constructor(public records: DPMRecord[]) {}
}

/** Sent by the server to the client to confirm data having been uploaded. */
export class UploadDataResponse implements UploadResponse {
    responseType = UploadResponseType.UPLOAD_RESPONSE;
}

/** Sent by the server or the client when the stream upload should be permanently stopped. This is sent on the channel for the stream. */
export class UploadStopRequest implements UploadRequest {
    requestType = UploadRequestType.UPLOAD_STOP;
}

/** Sent by the server or the client acknowledging the stop request. This is sent on the channel for the stream. */
export class UploadStopResponse implements UploadResponse {
    responseType = UploadResponseType.UPLOAD_STOP_RESPONSE;
}

/**
 * DATA FETCHING
 */

/** This is sent on the SocketEvent.OPEN_FETCH_CHANNEL channel */
export class OpenFetchChannelRequest implements Request {
    requestType = SocketEvent.OPEN_FETCH_CHANNEL;

    // eslint-disable-next-line no-useless-constructor
    constructor(public batchIdentifier: BatchIdentifier) {}
}

/** This is sent by the server in response to the OpenFetchChannelRequest */
export class OpenFetchChannelResponse implements Response {
    responseType = SocketResponseType.OPEN_FETCH_CHANNEL_RESPONSE;

    // eslint-disable-next-line no-useless-constructor
    constructor(public channelName: string, public batchIdentifier: BatchIdentifier) {}
}

export enum SocketFetchEvent {
    FETCH_DATA_ACKNOWLEDGE = "fetchDataAcknowledge",
    FETCH_DATA_END = "fetchDataEnd"
}

export enum FetchRequestType {
    START = "fetchDataStart",
    DATA = "data",
    STOP = "fetchDataStop"
}

export enum FetchResponseType {
    START_ACKNOWLEDGE = "startAcknowledge",
    DATA_ACKNOWLEDGE = "dataAcknowledge",
    STOP_ACKNOWLEDGE = "fetchDataStopAcknowledge"
}

export interface FetchRequest {
    requestType: FetchRequestType;
}

export interface FetchResponse {
    responseType: FetchResponseType;
}

/** This is sent on the channel returned by the OpenFetchChannelResponse */
export class StartFetchRequest implements FetchRequest {
    requestType = FetchRequestType.START;

    // eslint-disable-next-line no-useless-constructor
    constructor(public offset: number) {}
}

/** This is sent by the server in response to the StartFetchRequest */
export class StartFetchResponse implements FetchResponse {
    responseType = FetchResponseType.START_ACKNOWLEDGE;
}

export interface DataRecordContext {
    record: DPMRecord;
    offset: number;
}
export class DataSend implements FetchRequest {
    requestType = FetchRequestType.DATA;

    // eslint-disable-next-line no-useless-constructor
    constructor(public records: DataRecordContext[]) {}
}

export class DataAcknowledge implements FetchResponse {
    responseType = FetchResponseType.DATA_ACKNOWLEDGE;
}

export class DataStop implements FetchRequest {
    requestType = FetchRequestType.STOP;
}

export class DataStopAcknowledge implements FetchResponse {
    responseType = FetchResponseType.STOP_ACKNOWLEDGE;
}