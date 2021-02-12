export class ReservedKeywordsService {
    private static readonly RESERVED_KEYWORDS = [
        "ADMIN",
        "USER",
        "CATALOG",
        "COLLECTION",
        "LATEST",
        "TRENDING",
        "TOP",
        "RECENT",
        "RECENTLY",
        "MY",
        "ME",
        "DOCS",
        "IMAGES",
        "GRAPHQL",
        "ACCEPT-INVITE"
    ];

    public static validateReservedKeyword(keyword: string): void {
        if (this.isReservedKeyword(keyword)) {
            throw new Error("RESERVED_KEYWORD");
        }
    }

    private static isReservedKeyword(keyword: string): boolean {
        if (!keyword || !keyword.trim().length) {
            return false;
        }

        return ReservedKeywordsService.RESERVED_KEYWORDS.includes(keyword.toUpperCase());
    }
}
