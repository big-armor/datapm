export class SessionCache {
    private readonly DATA_KEY_SEPARATOR = "_";
    private readonly loadedData = new Map<string, any>();

    public async loadDataAsync(dataType: string, dataId: string, dataPromise: Promise<any>): Promise<any> {
        const dataKey = this.buildDataKey(dataType, dataId);
        const cachedData = this.loadedData.get(dataKey);
        if (cachedData) {
            // console.log("Found cached data", dataType, dataId);
            return cachedData;
        }

        const resolvedData = await dataPromise;
        this.loadedData.set(dataKey, resolvedData);

        return resolvedData;
    }

    private buildDataKey(dataType: string, dataId: String): string {
        return dataType + this.DATA_KEY_SEPARATOR + dataId;
    }
}
