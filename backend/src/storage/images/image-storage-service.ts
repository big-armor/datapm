import { Stream } from "stream";
import { FileStorageService } from "../files/file-storage-service";
import { ImageProcessor } from "./image-processor";
import { UserCoverImageProcessor } from "./user-cover-image-processor";
import { UserAvatarImageProcessor } from "./user-avatar-image-processor";
import { CatalogCoverImageProcessor } from "./catalog-cover-image-processor";
import { CollectionCoverImageProcessor } from "./collection-cover-image-processor";
import { PackageCoverImageProcessor } from "./package-cover-image-processor";
import { CatalogIdentifierInput, CollectionIdentifierInput, PackageIdentifierInput } from "../../generated/graphql";

enum ImageTypes {
    PACKAGE_COVER_IMAGE = "package_cover",
    COLLECTION_COVER_IMAGE = "collection_cover",
    USER_AVATAR_IMAGE = "user_avatar",
    USER_COVER_IMAGE = "user_cover",
    CATALOG_COVER_IMAGE = "catalog_cover"
}
enum Prefixes {
    USER = "user",
    PACKAGE = "package",
    COLLECTION = "collection",
    CATALOG = "catalog"
}
export class ImageStorageService {
    public static readonly INSTANCE = new ImageStorageService();
    private readonly fileStorageService = FileStorageService.INSTANCE;

    public async savePackageCoverImage(identifier: PackageIdentifierInput, imageBase64: string) {
        return this.saveImageFromBase64(
            Prefixes.PACKAGE + "/" + identifier.catalogSlug + "/" + identifier.packageSlug,
            ImageTypes.PACKAGE_COVER_IMAGE,
            imageBase64,
            new PackageCoverImageProcessor("image/jpeg")
        );
    }

    public async saveCollectionCoverImage(identifier: CollectionIdentifierInput, imageBase64: string) {
        return this.saveImageFromBase64(
            Prefixes.COLLECTION + "/" + identifier.collectionSlug,
            ImageTypes.COLLECTION_COVER_IMAGE,
            imageBase64,
            new CollectionCoverImageProcessor("image/jpeg")
        );
    }

    public async saveCatalogCoverImage(identifier: CatalogIdentifierInput, imageBase64: string) {
        return this.saveImageFromBase64(
            Prefixes.CATALOG + "/" + identifier.catalogSlug,
            ImageTypes.CATALOG_COVER_IMAGE,
            imageBase64,
            new CatalogCoverImageProcessor("image/jpeg")
        );
    }

    public async saveUserAvatarImage(username: string, imageBase64: string) {
        return this.saveImageFromBase64(
            Prefixes.USER + "/" + username,
            ImageTypes.USER_AVATAR_IMAGE,
            imageBase64,
            new UserAvatarImageProcessor("image/jpeg")
        );
    }

    public async saveUserCoverImage(username: string, imageBase64: string) {
        return this.saveImageFromBase64(
            Prefixes.USER + "/" + username,
            ImageTypes.USER_COVER_IMAGE,
            imageBase64,
            new UserCoverImageProcessor("image/jpeg")
        );
    }

    private async saveImageFromBase64(
        namespace: string,
        itemId: string,
        base64: string,
        processor: ImageProcessor
    ): Promise<void> {
        return this.saveImage(namespace, itemId, base64, processor);
    }

    private async saveImage(
        namespace: string,
        itemId: string,
        base64: string,
        processor: ImageProcessor
    ): Promise<void> {
        const buffer = this.convertBase64ToBuffer(base64);
        return this.fileStorageService.writeFileFromBuffer(namespace, itemId, buffer, processor.getFormatter());
    }

    public async readUserCoverImage(username: string): Promise<Stream> {
        return this.readImage(Prefixes.USER + "/" + username, ImageTypes.USER_COVER_IMAGE);
    }

    public async readUserAvatarImage(username: string): Promise<Stream> {
        return this.readImage(Prefixes.USER + "/" + username, ImageTypes.USER_AVATAR_IMAGE);
    }

    public async readCatalogCoverImage(identifier: CatalogIdentifierInput): Promise<Stream> {
        return this.readImage(Prefixes.CATALOG + "/" + identifier.catalogSlug, ImageTypes.CATALOG_COVER_IMAGE);
    }

    public async readCollectionCoverImage(identifier: CollectionIdentifierInput): Promise<Stream> {
        return this.readImage(Prefixes.CATALOG + "/" + identifier.collectionSlug, ImageTypes.COLLECTION_COVER_IMAGE);
    }

    public async readPackageCoverImage(identifier: PackageIdentifierInput): Promise<Stream> {
        return this.readImage(
            Prefixes.PACKAGE + "/" + identifier.catalogSlug + "/" + identifier.packageSlug,
            ImageTypes.PACKAGE_COVER_IMAGE
        );
    }

    public async deleteUserCoverImage(username: string): Promise<void> {
        return this.deleteImage(Prefixes.USER + "/" + username, ImageTypes.USER_COVER_IMAGE);
    }

    public async deleteUserAvatarImage(username: string): Promise<void> {
        return this.deleteImage(Prefixes.USER + "/" + username, ImageTypes.USER_AVATAR_IMAGE);
    }

    public async deleteCatalogCoverImage(identifier: CatalogIdentifierInput): Promise<void> {
        return this.deleteImage(Prefixes.CATALOG + "/" + identifier.catalogSlug, ImageTypes.CATALOG_COVER_IMAGE);
    }

    public async deleteCollectionCoverImage(identifier: CollectionIdentifierInput): Promise<void> {
        return this.deleteImage(
            Prefixes.COLLECTION + "/" + identifier.collectionSlug,
            ImageTypes.COLLECTION_COVER_IMAGE
        );
    }

    public async deletePackageCoverImage(identifier: PackageIdentifierInput): Promise<void> {
        return this.deleteImage(
            Prefixes.PACKAGE + "/" + identifier.catalogSlug + "/" + identifier.packageSlug,
            ImageTypes.PACKAGE_COVER_IMAGE
        );
    }

    private async deleteImage(namespace: string, imageId: string): Promise<void> {
        return this.fileStorageService.deleteFile(namespace, imageId);
    }

    private async readImage(namespace: string, imageId: string): Promise<Stream> {
        return this.fileStorageService.readFile(namespace, imageId);
    }

    private convertBase64ToBuffer(value: string): Buffer {
        const base64Content = value.includes(";base64,") ? value.split(";base64,")[1] : value;
        return Buffer.from(base64Content, "base64");
    }
}
