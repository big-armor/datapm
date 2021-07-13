declare module "buffer-peek-stream" {
    import { Readable } from "stream";

    export function promise(stream: Readable, size: number): Promise<[Buffer, Readable]>;
}
