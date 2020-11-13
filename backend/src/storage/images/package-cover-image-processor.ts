import { ImageProcessor } from "./image-processor";
import { ResizeOptions } from "sharp";

export class PackageCoverImageProcessor extends ImageProcessor {
    getResizeOptions(): ResizeOptions {
        return {
            width: 1000,
            height: 500
        };
    }
}
