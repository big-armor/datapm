declare module "minizlib" {
    import { Transform, TransformOptions } from "stream";

    export class Gzip extends Transform {
        constructor(options?: TransformOptions);
    }
}
