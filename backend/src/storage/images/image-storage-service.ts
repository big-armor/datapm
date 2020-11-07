import { Readable, Stream } from "stream";
import { FileStorageService, FileStorageNameSpace } from "../files/file-storage-service";
import { ImageProcessor } from "./image-processor";
import { UserCoverImageProcessor } from "./user-cover-image-processor";
import { UserAvatarImageProcessor } from "./user-avatar-image-processor";
import { CatalogCoverImageProcessor } from "./catalog-cover-image-processor";
import { CollectionCoverImageProcessor } from "./collection-cover-image-processor";
import { PackageCoverImageProcessor } from "./package-cover-image-processor";
import { CatalogIdentifierInput, CollectionIdentifierInput, PackageIdentifierInput } from "../../generated/graphql";

export class ImageStorageService {
    public static readonly INSTANCE = new ImageStorageService();
    private readonly fileStorageService = FileStorageService.INSTANCE;

    public async savePackageCoverImage(identifier: PackageIdentifierInput, imageBase64: string) {
        return this.saveImageFromBase64(
            FileStorageNameSpace.PACKAGE_COVER_IMAGE,
            identifier.catalogSlug + "-" + identifier.packageSlug,
            imageBase64,
            new PackageCoverImageProcessor("image/jpeg")
        );
    }

    public async saveCollectionCoverImage(identifier: CollectionIdentifierInput, imageBase64: string) {
        return this.saveImageFromBase64(
            FileStorageNameSpace.COLLECTION_COVER_IMAGE,
            identifier.collectionSlug,
            imageBase64,
            new CollectionCoverImageProcessor("image/jpeg")
        );
    }

    public async saveCatalogCoverImage(identifier: CatalogIdentifierInput, imageBase64: string) {
        return this.saveImageFromBase64(
            FileStorageNameSpace.CATALOG_COVER_IMAGE,
            identifier.catalogSlug,
            imageBase64,
            new CatalogCoverImageProcessor("image/jpeg")
        );
    }

    public async saveUserAvatarImage(username: string, imageBase64: string) {
        return this.saveImageFromBase64(
            FileStorageNameSpace.USER_AVATAR_IMAGE,
            username,
            imageBase64,
            new UserAvatarImageProcessor("image/jpeg")
        );
    }

    public async saveUserCoverImage(username: string, imageBase64: string) {
        return this.saveImageFromBase64(
            FileStorageNameSpace.USER_COVER_IMAGE,
            username,
            imageBase64,
            new UserCoverImageProcessor("image/jpeg")
        );
    }

    private async saveImageFromBase64(
        namespace: FileStorageNameSpace,
        itemId: string,
        base64: string,
        processor: ImageProcessor
    ): Promise<void> {
        const imageStream = this.convertBase64ToStream(base64);
        return this.saveImageFromStream(namespace, itemId, imageStream, processor);
    }

    private async saveImageFromStream(
        namespace: FileStorageNameSpace,
        itemId: string,
        stream: Stream,
        processor: ImageProcessor
    ): Promise<void> {
        return this.fileStorageService.writeFile(namespace, itemId, stream, processor.getFormatter());
    }

    public async readUserCoverImage(username: string): Promise<Stream> {
        return this.readImage(FileStorageNameSpace.USER_COVER_IMAGE, username);
    }

    public async readCatalogCoverImage(identifer: CatalogIdentifierInput): Promise<Stream> {
        return this.readImage(FileStorageNameSpace.CATALOG_COVER_IMAGE, identifer.catalogSlug);
    }

    public async readCollectionCoverImage(identifer: CollectionIdentifierInput): Promise<Stream> {
        return this.readImage(FileStorageNameSpace.COLLECTION_COVER_IMAGE, identifer.collectionSlug);
    }

    public async readUserAvatarImage(username: string): Promise<Stream> {
        return this.readImage(FileStorageNameSpace.USER_AVATAR_IMAGE, username);
    }

    public async readImage(namespace: FileStorageNameSpace, imageId: string): Promise<Stream> {
        return this.fileStorageService.readFile(namespace, imageId);
    }

    private convertBase64ToStream(base64: string): Stream {
        const buffer = this.convertBase64ToBuffer(base64);
        const bufferStream = new Readable();
        bufferStream.push(buffer);
        bufferStream.push(null);
        return bufferStream;
    }

    private convertBase64ToBuffer(base64: string): Buffer {
        const base64Content = base64.includes(";base64,") ? base64.split(";base64,")[1] : base64;
        return Buffer.from(base64Content, "base64");
    }
}
