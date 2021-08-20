import globParent from "glob-parent";
import isGlob from "is-glob";
import { SourceDescription, Source } from "../../../repository/Source";
import fs from "fs";
import { TYPE, DISPLAY_NAME } from "./LocalFileRepositoryDescription";

export class LocalFileSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        if (uri.startsWith("file://")) return true;

        if (isGlob(uri) && fs.existsSync(globParent(uri))) return true;

        return fs.existsSync(uri);
    }

    async getSource(): Promise<Source> {
        const module = await import("./LocalFileSource");
        return new module.LocalFileSource();
    }
}
