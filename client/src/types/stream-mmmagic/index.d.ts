declare module "stream-mmmagic" {
    import { Readable } from "stream";
    export function promise(
        stream: Readable,
        options: {
            magicFile: string;
        }
    ): Promise<[{ type: string; encoding: string }, Readable]>;
}
