/** How updates are provided from the source */
export enum UpdateMethod {
    BATCH_FULL_SET = "BATCH_FULL_SET", // All records, every time
    APPEND_ONLY_LOG = "APPEND_ONLY_LOG", // New records are appended to the end of a stream (uses offsets)
    CONTINUOUS = "CONTINUOUS" // New records are appended to the the stream, and the stream should never close
}
