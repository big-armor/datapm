import sharp, { ResizeOptions, Sharp } from "sharp";

export abstract class ImageProcessor {
    private mimeType: string;

    public constructor(mimeType: string) {
        this.mimeType = mimeType;
    }

    public getFormatter(): Sharp {
        const resizer = sharp().resize(this.getResizeOptions());
        return this.getConversionFormat(resizer);
    }

    public abstract getResizeOptions(): ResizeOptions;

    private getConversionFormat(resizer: Sharp): Sharp {
        if (this.mimeType === "image/png") {
            return resizer.png();
        } else {
            return resizer.jpeg();
        }
    }
}
