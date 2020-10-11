import { Storage } from "./storage";
import { FileStorage } from "./file-storage";

export class StorageProvider {
	private static readonly PREFIX_PATTERN = "://";
	private static readonly FILE_STORAGE_URL_PREFIX = "file";
	private static readonly GOOGLE_CLOUD_STORAGE_URL_PREFIX = "gc";

	public static getStorageByUrl(url: string): Storage {
		const urlParts = url.split(StorageProvider.PREFIX_PATTERN);
		if (urlParts.length < 2) {
			throw new Error("Url prefix not present for the Storage!");
		}

		const urlPrefix = urlParts[0];
		switch (urlPrefix) {
			case StorageProvider.FILE_STORAGE_URL_PREFIX:
				return new FileStorage(urlParts[1]);
			case StorageProvider.GOOGLE_CLOUD_STORAGE_URL_PREFIX:
				return new FileStorage(urlParts[1]); // TODO: Add google cloud storage implementation
			default:
				throw new Error("Unrecognized storage url prefix: " + urlPrefix);
		}
	}
}
