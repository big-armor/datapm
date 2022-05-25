import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: "entries"
})
export class EntriesPipe implements PipeTransform {
    transform(value: any): {key: string, value: any}[] {
        return Object.entries(value).map(([key, value]) => ({key, value}));
    }
}
