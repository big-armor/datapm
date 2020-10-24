import {ImageType} from "./image-type";
import {UserAvatarImageProcessor} from "./user-avatar-image-processor";
import {ImageProcessor} from "./image-processor";
import {UserCoverImageProcessor} from "./user-cover-image-processor";
import {CatalogCoverImageProcessor} from "./catalog-cover-image-processor";
import {PackageCoverImageProcessor} from "./package-cover-image-processor";
import {CollectionCoverImageProcessor} from "./collection-cover-image-processor";

export class ImageProcessorProvider {

    public static getImageProcessor(imageType: ImageType, mimeType: string): ImageProcessor {
        switch (imageType) {
            case ImageType.USER_COVER_IMAGE:
                return new UserCoverImageProcessor(mimeType);
            case ImageType.USER_AVATAR_IMAGE:
                return new UserAvatarImageProcessor(mimeType);
            case ImageType.CATALOG_COVER_IMAGE:
                return new CatalogCoverImageProcessor(mimeType);
            case ImageType.PACKAGE_COVER_IMAGE:
                return new PackageCoverImageProcessor(mimeType);
            case ImageType.COLLECTION_COVER_IMAGE:
                return new CollectionCoverImageProcessor(mimeType);
            default:
                throw new Error("Could not find processor for image type: " + imageType);
        }
    }
}