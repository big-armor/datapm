import { UpdateMethod } from "./DataHandlingUtil";
import { MajorVersionIdentifier, SchemaIdentifier } from "./main";
import { DPMRecord } from "./PackageUtil";
import { Parameter, ParameterAnswer } from "./Parameter";
import { SinkState } from "./SinkState";

/** This identifies a single stream instance during upload. It is the same structure as Source implementations, but here
 * meant for reference only during uploads to a DataPM registry. This is based on the SchemaIdentifier which is based on
 * a PackageIdentifier.
 */
export interface SchemaRepositoryStreamIdentifier extends SchemaIdentifier {
    sourceType: string;
    sourceSlug: string;
    streamSetSlug: string;
    streamSlug: string;
}

/** This identifiest a single batch upload (which can be a series of appended streams) to the
 * data registry service. This class is in SocketUtil.ts because it is specifically not part of the
 * PackageFile specification - which does not include the concept of batches.
 *
 * A "batch" is like a version number on an upload of a stream. Clients can choose to upload a new batch (even
 * over a very long period of time), or start a new batch and append to it. The term version was not used
 * because that is reserved for the package version number. A batch is related to one major version of a package.
 */
export interface BatchRepositoryIdentifier extends SchemaRepositoryStreamIdentifier {
    batch: number;
}

export interface DataRecordContext {
    offset: number;
    record: DPMRecord;
}

/**
 * TOP LEVEL EVENTS - These are generally sent by the client to
 * request that the server start a process. Process specific events
 * and interfaces are below.
 */

export enum SocketEvent {
    READY = "ready",
    OPEN_FETCH_CHANNEL = "openFetchChannel",
    START_DATA_UPLOAD = "startDataUpload",
    SET_STREAM_ACTIVE_BATCHES = "setStreamActiveBatchesRequest",
    SCHEMA_INFO_REQUEST = "schemaInfoRequest",
    PACKAGE_VERSION_SINK_STATE_REQUEST = "packageVersionSinkStateRequest",
    START_PACKAGE_UPDATE = "startPackageUpdate",
    START_PACKAGE = "startPackage",
    START_FETCH = "startFetch"
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
    OPEN_FETCH_CHANNEL_RESPONSE = "openFetchChannelResponse",
    PACKAGE_VERSION_SINK_STATE_RESPONSE = "packageVersionSinkStateResponse",
    START_PACKAGE_UPDATE_RESPONSE = "startPackageUpdateResponse",
    START_PACKAGE_RESPONSE = "startPackageResponse"
}

export interface Request {
    requestType: SocketEvent;
}

export interface Response {
    responseType: SocketResponseType;
}

export type StartJobRequest = Request;

export interface StartJobResponse extends Response {
    channelName: string;
}

/** Error handling */
export class ErrorResponse implements Response {
    responseType = SocketResponseType.ERROR;

    // eslint-disable-next-line no-useless-constructor
    constructor(public message: string, public errorType: SocketError) {}
}

/** Sink state INFO  */

/** Sent by the client to request information about a given stream */
export class PackageSinkStateRequest implements Request {
    requestType = SocketEvent.PACKAGE_VERSION_SINK_STATE_REQUEST;

    // eslint-disable-next-line no-useless-constructor
    constructor(public identifier: MajorVersionIdentifier) {}
}

export class PackageSinkStateResponse implements Response {
    responseType = SocketResponseType.PACKAGE_VERSION_SINK_STATE_RESPONSE;

    // eslint-disable-next-line no-useless-constructor
    constructor(public identifier: MajorVersionIdentifier, public state: SinkState) {}
}

/** STREAM INFO  */

/** Sent by the client to request information about the streams available for a version of package */
export class PackageStreamsRequest implements Request {
    requestType = SocketEvent.SCHEMA_INFO_REQUEST;

    // eslint-disable-next-line no-useless-constructor
    constructor(public identifier: MajorVersionIdentifier) {}
}

export interface BatchInfo {
    batchIdentifier: BatchRepositoryIdentifier;
    highestOffset: number;
    // TODO estimated record count
    updatedAt: Date;
    updateMethod: UpdateMethod;
}
export interface BatchesBySchema {
    [schema: string]: BatchInfo[];
}

export class PackageStreamsResponse implements Response {
    responseType = SocketResponseType.SCHEMA_INFO_RESPONSE;

    // eslint-disable-next-line no-useless-constructor
    constructor(public identifier: MajorVersionIdentifier, public batchesBySchema: BatchesBySchema) {}
}

/** Sent by the client to set the batches for given streams. All done in a transaction, so that other
 * clients get lists of compatible streams
 */
export class SetStreamActiveBatchesRequest implements Request {
    requestType = SocketEvent.SET_STREAM_ACTIVE_BATCHES;

    // eslint-disable-next-line no-useless-constructor
    constructor(public batchIdentifiers: BatchRepositoryIdentifier[]) {}
}

export class SetStreamActiveBatchesResponse implements Response {
    responseType = SocketResponseType.SET_STREAM_ACTIVE_BATCHES;

    // eslint-disable-next-line no-useless-constructor
    constructor(public batchIdentifiers: BatchRepositoryIdentifier[]) {}
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
export class StartUploadRequest implements StartJobRequest {
    requestType = SocketEvent.START_DATA_UPLOAD;

    // eslint-disable-next-line no-useless-constructor
    constructor(
        public schemaStreamIdentifier: SchemaRepositoryStreamIdentifier,
        public newBatch: boolean,
        public updateMethod: UpdateMethod
    ) {}
}

/** This is sent by the server in response to the StreamUploadRequest */
export class StartUploadResponse implements StartJobResponse {
    responseType = SocketResponseType.START_DATA_UPLOAD_RESPONSE;

    // eslint-disable-next-line no-useless-constructor
    constructor(public channelName: string, public batchIdentifier: BatchRepositoryIdentifier) {}
}

/** Sent by the client to the server to upload data.  */
export class UploadDataRequest implements UploadRequest {
    requestType = UploadRequestType.UPLOAD_DATA;

    // eslint-disable-next-line no-useless-constructor
    constructor(public records: DataRecordContext[]) {}
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
export class OpenFetchProxyChannelRequest implements StartJobRequest {
    requestType = SocketEvent.OPEN_FETCH_CHANNEL;

    // eslint-disable-next-line no-useless-constructor
    constructor(public batchIdentifier: BatchRepositoryIdentifier) {}
}

/** This is sent by the server in response to the OpenFetchChannelRequest */
export class OpenFetchProxyChannelResponse implements StartJobResponse {
    responseType = SocketResponseType.OPEN_FETCH_CHANNEL_RESPONSE;

    // eslint-disable-next-line no-useless-constructor
    constructor(public channelName: string, public batchIdentifier: BatchRepositoryIdentifier) {}
}

export enum SocketProxyFetchEvent {
    FETCH_DATA_ACKNOWLEDGE = "fetchDataAcknowledge",
    FETCH_DATA_END = "fetchDataEnd"
}

export enum ProxyFetchRequestType {
    START = "fetchDataStart",
    DATA = "data",
    STOP = "fetchDataStop"
}

export enum ProxyFetchResponseType {
    START_ACKNOWLEDGE = "startAcknowledge",
    DATA_ACKNOWLEDGE = "dataAcknowledge",
    STOP_ACKNOWLEDGE = "fetchDataStopAcknowledge"
}

export interface ProxyFetchRequest {
    requestType: ProxyFetchRequestType;
}

export interface ProxyFetchResponse {
    responseType: ProxyFetchResponseType;
}

/** This is sent on the channel returned by the OpenFetchChannelResponse */
export class StartProxyFetchRequest implements ProxyFetchRequest {
    requestType = ProxyFetchRequestType.START;

    // eslint-disable-next-line no-useless-constructor
    constructor(public offset: number) {}
}

/** This is sent by the server in response to the StartProxyFetchRequest */
export class StartProxyFetchResponse implements ProxyFetchResponse {
    responseType = ProxyFetchResponseType.START_ACKNOWLEDGE;
}

export class DataSend implements ProxyFetchRequest {
    requestType = ProxyFetchRequestType.DATA;

    // eslint-disable-next-line no-useless-constructor
    constructor(public records: DataRecordContext[]) {}
}

export class DataAcknowledge implements ProxyFetchResponse {
    responseType = ProxyFetchResponseType.DATA_ACKNOWLEDGE;
}

export class DataStop implements ProxyFetchRequest {
    requestType = ProxyFetchRequestType.STOP;
}

export class DataStopAcknowledge implements ProxyFetchResponse {
    responseType = ProxyFetchResponseType.STOP_ACKNOWLEDGE;
}

/** Sent by a client requesting that a package job be started */
export class StartPackageRequest implements StartJobRequest {
    requestType = SocketEvent.START_PACKAGE;
    catalogSlug: string;
    packageSlug: string;
    packageTitle: string;
    packageDescription: string;
    defaults: boolean;

    constructor(
        catalogSlug: string,
        packageSlug: string,
        packageTitle: string,
        packageDescription: string,
        defaults: boolean
    ) {
        this.catalogSlug = catalogSlug;
        this.packageSlug = packageSlug;
        this.packageTitle = packageTitle;
        this.packageDescription = packageDescription;
        this.defaults = defaults;
    }
}

export class StartPackageResponse implements StartJobResponse {
    responseType = SocketResponseType.START_PACKAGE_RESPONSE;
    public channelName: string;

    constructor(channelName: string) {
        this.channelName = channelName;
    }
}

/** Sent by a client requesting that a package job be started */
export class StartFetchRequest implements StartJobRequest {
    requestType = SocketEvent.START_FETCH;
    catalogSlug: string;
    packageSlug: string;
    defaults: boolean;
    sinkType: string;

    constructor(catalogSlug: string, packageSlug: string, sinkType: string, defaults: boolean) {
        this.catalogSlug = catalogSlug;
        this.packageSlug = packageSlug;
        this.sinkType = sinkType;
        this.defaults = defaults;
    }
}

export class StartFetchResponse implements StartJobResponse {
    responseType = SocketResponseType.START_PACKAGE_RESPONSE;
    public channelName: string;

    constructor(channelName: string) {
        this.channelName = channelName;
    }
}

/** Sent by a client requesting that the schema contents of a package be updated.  */
export class StartPackageUpdateRequest implements StartJobRequest {
    requestType: SocketEvent = SocketEvent.START_PACKAGE_UPDATE;

    // eslint-disable-next-line no-useless-constructor
    constructor(
        public packageIdentifier: {
            catalogSlug: string;
            packageSlug: string;
        },
        public defaults: boolean
    ) {}
}

export class StartPackageUpdateResponse implements StartJobResponse {
    responseType: SocketResponseType = SocketResponseType.START_PACKAGE_UPDATE_RESPONSE;
    channelName: string;

    constructor(channelName: string) {
        this.channelName = channelName;
    }
}

export enum JobRequestType {
    /** Sent by the client on the specified channel when the client is ready to begin */
    START_JOB = "startJob",

    /** Sent by the server when there is a message to print on the client */
    PRINT = "print",

    /** Sent by the server when there is a parameter to respond to  */
    PROMPT = "prompt",

    /** Sent by the server when there is a long running task being started  */
    START_TASK = "startTask",

    /** Sent by the server when there are updates to a long running task */
    TASK_UPDATE = "taskUpdate",

    /** Sent by the server when a long running task has ended */
    END_TASK = "endTask",

    /** Sent by the server when a new step of the job has begun */
    SET_CURRENT_STEP = "setCurrentStep",

    /** Sent by the server when all steps of a job are known */
    SET_STEPS = "setSteps",

    /** Sent by the client or the server when the job is done or should be abandoned */
    EXIT = "exit",

    /** When responding with an error */
    ERROR = "error"
}

/** For certain JobMessages, they need a message type. This is really a copy and paste
 * of the MessageType from datapm-client-lib.
 */
export type JobMessageType = "NONE" | "ERROR" | "WARN" | "INFO" | "DEBUG" | "SUCCESS" | "FAIL" | "UPDATE" | "START";

/** For certain JobMessages, they need a task status. This is a copy of the TaskStatus from datpam-client-lib */
export type TaskStatus = "RUNNING" | "ERROR" | "SUCCESS";

export class JobResult<T> {
    exitCode: number;
    errorMessage?: string;
    result?: T | undefined;
}

/** Sent by the client or the server during a job */
export class JobMessageRequest {
    constructor(requestType: JobRequestType) {
        this.requestType = requestType;
    }

    requestType: JobRequestType;
    message?: string;
    messageType?: JobMessageType;
    jobResult?: JobResult<unknown>;
    exitResult?: unknown;
    taskStatus?: TaskStatus;
    taskId?: string;
    steps?: string[];
    prompts?: Parameter[];
}

/** A response to the request sent by the client or the server. The response type is always
 * the same as the request type.
 */
export class JobMessageResponse<T extends string = string> {
    constructor(responseType: JobRequestType) {
        this.responseType = responseType;
    }

    message?: string;
    responseType: JobRequestType;
    answers?: ParameterAnswer<T>;
}
