import {ImageProcessor} from "./image-processor";
import {ImageType} from "./image-type";
import {ResizeOptions} from "sharp";

export class CollectionCoverImageProcessor extends ImageProcessor {

    getImageType(): ImageType {
        return ImageType.COLLECTION_COVER_IMAGE;
    }

    getResizeOptions(): ResizeOptions {
        return {
            width: 1000,
            height: 500
        };
    }

}