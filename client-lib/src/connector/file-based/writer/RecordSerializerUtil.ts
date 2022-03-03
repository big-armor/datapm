import { Maybe } from "../../../util/Maybe";
import { DPMRecordSerializer, DPMRecordSerializerDescription } from "./RecordSerializer";
import { RecordSerializerAVRODescription } from "./RecordSerializerAVRODescription";
import { RecordSerializerCSVDescription } from "./RecordSerializerCSVDescription";
import { RecordSerializerJSONDescription } from "./RecordSerializerJSONDescription";

export function getRecordSerializers(): DPMRecordSerializerDescription[] {
    return [
        new RecordSerializerCSVDescription(),
        new RecordSerializerJSONDescription(),
        new RecordSerializerAVRODescription()
    ];
}

export async function getRecordSerializer(type: string): Promise<Maybe<DPMRecordSerializer>> {
    const writers = getRecordSerializers();
    return (
        (await writers
            .find((writer) => {
                return writer.getOutputMimeType() === type;
            })
            ?.getRecordSerializer()) || null
    );
}
