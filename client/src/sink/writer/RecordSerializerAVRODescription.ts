import { DPMRecordSerializer, DPMRecordSerializerDescription } from "./RecordSerializer";

export const DISPLAY_NAME = "AVRO";
export const MIME_TYPE = "application/avro";
export const EXTENSION = "avro";

export class RecordSerializerAVRODescription implements DPMRecordSerializerDescription {
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
        const module = await import("./RecordSerializerAvro");
        return new module.RecordSerializerAVRO();
    }
}
