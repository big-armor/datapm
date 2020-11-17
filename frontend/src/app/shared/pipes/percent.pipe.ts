import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: "percent"
})
export class PercentPipe implements PipeTransform {
    transform(value: number): string {
        return (value * 100).toFixed(2).replace(/\.?0+$/, "") + "%";
    }
}
