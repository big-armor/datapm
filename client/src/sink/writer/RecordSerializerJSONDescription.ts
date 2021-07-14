import { DPMRecordSerializer, DPMRecordSerializerDescription } from "./RecordSerializer";
export const DISPLAY_NAME = "JSON (JavaScript Object Notation)";
export const MIME_TYPE = "application/json";
export const EXTENSION = "json";

export class RecordSerializerCSVDescription implements DPMRecordSerializerDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getOutputMimeType(): string {
        return MIME_TYPE;
    }

    getFileExtension(): string {
        return EXTENSION;
    }

    async getRecordSerializer(): Promise<DPMRecordSerializer> {
        const module = await import("./RecordSerializerJSON");
        return new module.RecordSerializerJSON();
    }
}
