import { Pipe, PipeTransform } from "@angular/core";
import { Schema } from "datapm-lib";

@Pipe({
    name: "packageSize"
})
export class PackageSizePipe implements PipeTransform {
    private readonly units = ["B", "KB", "MB", "GB"];

    transform(value: Schema[]): unknown {
        const totalSize = value.reduce((sum, item) => sum + item.byteCount, 0);
        return this.convertSize(totalSize);
    }

    private convertSize(bytes: number) {
        for (let i = 0; i < this.units.length; i++) {
            if (bytes < 1024) {
                return bytes.toFixed(2).replace(/\.?0+$/, "") + this.units[i];
            }
            bytes /= 1024;
        }
    }
}
