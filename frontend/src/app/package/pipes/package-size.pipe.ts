import { Pipe, PipeTransform } from "@angular/core";
import { CountPrecision, PackageFile, Schema } from "datapm-lib";

@Pipe({
    name: "packageSize"
})
export class PackageSizePipe implements PipeTransform {
    private readonly units = ["B", "KB", "MB", "GB"];

    transform(value: PackageFile): unknown {
        const totalSize =
            value.sources.reduce(
                (sum, item) => sum + item.streamSets.reduce((sum, item) => sum + item.streamStats.byteCount, 0),
                0
            ) || 0;

        const bytes = this.convertSize(totalSize);

        let highestPrecision = CountPrecision.EXACT;

        for (const source of value.sources) {
            if (source.streamSets.find((s) => s.streamStats.byteCountPrecision == CountPrecision.GREATER_THAN) != null)
                highestPrecision = CountPrecision.GREATER_THAN;
            else if (
                source.streamSets.find((s) => s.streamStats.byteCountPrecision == CountPrecision.APPROXIMATE) != null
            )
                highestPrecision = CountPrecision.APPROXIMATE;
        }

        let prefix = "";

        if (highestPrecision == CountPrecision.GREATER_THAN) {
            prefix = ">";
        } else if (highestPrecision == CountPrecision.APPROXIMATE) {
            prefix = "~";
        }

        return prefix + bytes;
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
