import { S } from "@angular/cdk/keycodes";
import { Pipe, PipeTransform } from "@angular/core";
import { PackageFile, UpdateMethod } from "datapm-lib"

@Pipe({
    name: "packageFileUpdateMethod"
})
export class PackageFileUpdateMethodPipe implements PipeTransform {
    transform(value: PackageFile): string {
        if (!value) {
            return "";
        }

        const updateMethods: Set<UpdateMethod> = new Set<UpdateMethod>();


        for(const source of value.sources) {
            for(const stream of source.streamSets) {
                for(const updateMethod of stream.updateMethods) {
                    updateMethods.add(updateMethod);
                }
            }
        }

        const updateMethodsArray = Array.from(updateMethods);

       return updateMethodsArray.map(u => {
           switch (u) {
               case UpdateMethod.CONTINUOUS:
                return "stream";
               case UpdateMethod.APPEND_ONLY_LOG:
                return "incremental";
               case UpdateMethod.BATCH_FULL_SET:
                return "batch";
               default: 
                return undefined;
           }
       }).filter(u => u !== undefined).join(", ");
    }
}
