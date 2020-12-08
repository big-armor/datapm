import { Stream, Readable } from "stream";
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

    public async savePackageCoverImage(packageId: number, imageBase64: string) {
        return this.saveImageFromBase64(
            Prefixes.PACKAGE + "/" + packageId,
            ImageTypes.PACKAGE_COVER_IMAGE,
            imageBase64,
            new PackageCoverImageProcessor("image/jpeg")
        );
    }

    public async saveCollectionCoverImage(collectionId: number, imageBase64: string) {
        return this.saveImageFromBase64(
            Prefixes.COLLECTION + "/" + collectionId,
            ImageTypes.COLLECTION_COVER_IMAGE,
            imageBase64,
            new CollectionCoverImageProcessor("image/jpeg")
        );
    }

    public async saveCatalogCoverImage(catalogId: number, imageBase64: string) {
        return this.saveImageFromBase64(
            Prefixes.CATALOG + "/" + catalogId,
            ImageTypes.CATALOG_COVER_IMAGE,
            imageBase64,
            new CatalogCoverImageProcessor("image/jpeg")
        );
    }

    public async saveUserAvatarImage(userId: number, imageBase64: string) {
        return this.saveImageFromBase64(
            Prefixes.USER + "/" + userId,
            ImageTypes.USER_AVATAR_IMAGE,
            imageBase64,
            new UserAvatarImageProcessor("image/jpeg")
        );
    }

    public async saveUserCoverImage(userId: number, imageBase64: string) {
        return this.saveImageFromBase64(
            Prefixes.USER + "/" + userId,
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

    public async readUserCoverImage(userId: number): Promise<Readable> {
        return this.readImage(Prefixes.USER + "/" + userId, ImageTypes.USER_COVER_IMAGE);
    }

    public async readUserAvatarImage(userId: number): Promise<Readable> {
        return this.readImage(Prefixes.USER + "/" + userId, ImageTypes.USER_AVATAR_IMAGE);
    }

    public async readCatalogCoverImage(catalogId: number): Promise<Readable> {
        return this.readImage(Prefixes.CATALOG + "/" + catalogId, ImageTypes.CATALOG_COVER_IMAGE);
    }

    public async readCollectionCoverImage(catalogId: number): Promise<Readable> {
        return this.readImage(Prefixes.CATALOG + "/" + catalogId, ImageTypes.COLLECTION_COVER_IMAGE);
    }

    public async readPackageCoverImage(packageId: number): Promise<Readable> {
        return this.readImage(Prefixes.PACKAGE + "/" + packageId, ImageTypes.PACKAGE_COVER_IMAGE);
    }

    public async deleteUserCoverImage(userId: number): Promise<void> {
        return this.deleteImage(Prefixes.USER + "/" + userId, ImageTypes.USER_COVER_IMAGE);
    }

    public async deleteUserAvatarImage(userId: number): Promise<void> {
        return this.deleteImage(Prefixes.USER + "/" + userId, ImageTypes.USER_AVATAR_IMAGE);
    }

    public async deleteCatalogCoverImage(catalogId: number): Promise<void> {
        return this.deleteImage(Prefixes.CATALOG + "/" + catalogId, ImageTypes.CATALOG_COVER_IMAGE);
    }

    public async deleteCollectionCoverImage(catalogId: number): Promise<void> {
        return this.deleteImage(Prefixes.COLLECTION + "/" + catalogId, ImageTypes.COLLECTION_COVER_IMAGE);
    }

    public async deletePackageCoverImage(packageId: number): Promise<void> {
        return this.deleteImage(Prefixes.PACKAGE + "/" + packageId, ImageTypes.PACKAGE_COVER_IMAGE);
    }

    private async deleteImage(namespace: string, imageId: string): Promise<void> {
        try {
            return this.fileStorageService.deleteFile(namespace, imageId);
        } catch (error) {
            if (error.message.includes("FILE_DOES_NOT_EXIST")) {
                console.warn("Tried deleting a file that does not exist" + namespace + " " + imageId);
                return;
            }

            throw error;
        }
    }

    private async readImage(namespace: string, imageId: string): Promise<Readable> {
        return this.fileStorageService.readFile(namespace, imageId);
    }

    private convertBase64ToBuffer(value: string): Buffer {
        const base64Content = value.includes(";base64,") ? value.split(";base64,")[1] : value;
        return Buffer.from(base64Content, "base64");
    }
}
