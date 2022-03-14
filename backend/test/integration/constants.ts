import { RandomUuid } from "testcontainers/dist/uuid";

export const TEMP_STORAGE_PATH: string = "tmp-registry-server-storage-" + new RandomUuid().nextUuid();
