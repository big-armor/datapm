import { DPMStorage } from "./dpm-storage";
import { FileStorage } from "./file-storage";
import { GoogleCloudStorage } from "./google-cloud-storage";

export class StorageProvider {
    private static readonly PREFIX_PATTERN = "://";

    public static getStorage(): DPMStorage {
        const storageUrl = process.env.STORAGE_URL;
        if (!storageUrl) {
            throw new Error("No storage url defined");
        }

        return StorageProvider.getStorageByUrl(storageUrl);
    }

    public static getStorageByUrl(url: string): DPMStorage {
        const urlParts = url.split(StorageProvider.PREFIX_PATTERN);
        if (urlParts.length < 2) {
            throw new Error("Url prefix not present for the Storage!");
        }

        const schemaUrlPrefix = urlParts[0];
        const schemaUrl = urlParts[1];
        switch (schemaUrlPrefix) {
            case FileStorage.SCHEMA_URL_PREFIX:
                return new FileStorage(schemaUrl);
            case GoogleCloudStorage.SCHEMA_URL_PREFIX:
                return new GoogleCloudStorage(schemaUrl);
            default:
                throw new Error("Unrecognized storage url prefix: " + schemaUrlPrefix);
        }
    }
}
