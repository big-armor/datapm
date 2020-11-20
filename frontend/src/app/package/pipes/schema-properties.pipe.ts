import { Pipe, PipeTransform } from "@angular/core";
import { Schema } from "datapm-lib";

@Pipe({
    name: "schemaProperties"
})
export class SchemaPropertiesPipe implements PipeTransform {
    transform(value: Schema): Schema[] {
        return Object.values(value?.properties);
    }
}
