import { Pipe, PipeTransform } from "@angular/core";

import { distanceInWordsToNow } from "date-fns";

@Pipe({
    name: "timeAgo"
})
export class TimeAgoPipe implements PipeTransform {
    transform(value: string, ..._args: any[]): string {
        return distanceInWordsToNow(value, { addSuffix: true, includeSeconds: false });
    }
}
