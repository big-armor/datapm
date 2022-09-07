export class ReservedKeywordsService {
    private static readonly RESERVED_KEYWORDS = [
        "ADMIN",
        "USER",
        "CATALOG",
        "COLLECTION",
        "WS",
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
        "ACCEPT-INVITE",
        "CLIENT-INSTALLERS",
        "SITEMAP",
        "GROUP"
    ];

    public static validateReservedKeyword(keyword: string): void {
        if (this.isReservedKeyword(keyword)) {
            throw new Error("RESERVED_KEYWORD");
        }
    }

    public static isReservedKeyword(keyword: string): boolean {
        if (!keyword || !keyword.trim().length) {
            return false;
        }

        return ReservedKeywordsService.RESERVED_KEYWORDS.includes(keyword.toUpperCase());
    }
}
