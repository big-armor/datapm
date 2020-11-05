import { ImageProcessor } from "./image-processor";
import { ImageType } from "./image-type";
import { ResizeOptions } from "sharp";

export class UserAvatarImageProcessor extends ImageProcessor {
    getImageType(): ImageType {
        return ImageType.USER_AVATAR_IMAGE;
    }

    getResizeOptions(): ResizeOptions {
        return {
            width: 500,
            height: 500
        };
    }
}
