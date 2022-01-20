
declare module "snappystream" {
    import { Transform, TransformOptions } from "stream";

    export class SnappyStream extends Transform {
        constructor(options?: TransformOptions);
    }
}