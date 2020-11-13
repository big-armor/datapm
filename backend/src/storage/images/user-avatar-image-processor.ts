import { ImageProcessor } from "./image-processor";
import { ResizeOptions } from "sharp";

export class UserAvatarImageProcessor extends ImageProcessor {
    getResizeOptions(): ResizeOptions {
        return {
            width: 500,
            height: 500
        };
    }
}
