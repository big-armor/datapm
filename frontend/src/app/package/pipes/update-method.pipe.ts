import { Pipe, PipeTransform } from "@angular/core";
import {  UpdateMethod } from "datapm-lib"

@Pipe({
    name: "updateMethod"
})
export class UpdateMethodPipe implements PipeTransform {
    transform(value: UpdateMethod): string {
        switch (value) {
               case UpdateMethod.CONTINUOUS:
                return "stream";
               case UpdateMethod.APPEND_ONLY_LOG:
                return "incremental";
               case UpdateMethod.BATCH_FULL_SET:
                return "batch";
               default: 
                return undefined;
           }
    }
}
