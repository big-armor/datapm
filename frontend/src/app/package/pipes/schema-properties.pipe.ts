import { Pipe, PipeTransform } from "@angular/core";
import { Property, Schema } from "datapm-lib";

@Pipe({
    name: "schemaProperties"
})
export class SchemaPropertiesPipe implements PipeTransform {
    transform(value: Schema): Property[] {
        return Object.values(value?.properties);
    }
}
