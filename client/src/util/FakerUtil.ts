export const FakerCategories = [
    "address",
    "commerce",
    "company",
    "database",
    "date",
    "finance",
    "git",
    "hacker",
    "image",
    "internet",
    "lorem",
    "name",
    "phone",
    "random",
    "system",
    "vehicle"
];

export const FakerTypes: Record<string, Array<string>> = {
    address: [
        "zipCode",
        "zipCodeByState",
        "city",
        "cityPrefix",
        "citySuffix",
        "streetName",
        "streetAddress",
        "streetSuffix",
        "streetPrefix",
        "secondaryAddress",
        "county",
        "country",
        "countryCode",
        "state",
        "stateAbbr",
        "latitude",
        "longitude",
        "direction",
        "cardinalDirection",
        "ordinalDirection",
        "timeZone"
    ],
    commerce: [
        "color",
        "department",
        "productName",
        "price",
        "productAdjective",
        "productMaterial",
        "product",
        "productDescription"
    ],
    company: [
        "companyName",
        "companySuffix",
        "catchPhrase",
        "bs",
        "catchPhraseAdjective",
        "catchPhraseDescriptor",
        "catchPhraseNoun",
        "bsAdjective",
        "bsBuzz",
        "bsNoun"
    ],
    database: ["column", "type", "collation", "engine"],
    date: ["past", "future", "recent", "soon", "month", "weekday"],
    finance: [
        "account",
        "accountName",
        "routingNumber",
        "mask",
        "transactionType",
        "currencyCode",
        "currencyName",
        "currencySymbol",
        "bitcoinAddress",
        "litecoinAddress",
        "creditCardNumber",
        "creditCardCVV",
        "ethereumAddress",
        "iban",
        "bic",
        "transactionDescription"
    ],
    git: ["branch", "commitEntry", "commitMessage", "commitSha", "shortSha"],
    hacker: ["abbreviation", "adjective", "noun", "verb", "ingverb", "phrase"],
    image: [
        "image",
        "avatar",
        "imageUrl",
        "abstract",
        "animals",
        "business",
        "cats",
        "city",
        "food",
        "nightlife",
        "fashion",
        "people",
        "nature",
        "sports",
        "technics",
        "transport",
        "dataUri"
    ],
    internet: [
        "avatar",
        "email",
        "exampleEmail",
        "userName",
        "protocol",
        "url",
        "domainName",
        "domainSuffix",
        "domainWord",
        "ip",
        "ipv6",
        "userAgent",
        "color",
        "mac",
        "password"
    ],
    lorem: ["word", "words", "sentence", "slug", "sentences", "paragraph", "paragraphs", "text", "lines"],
    name: [
        "firstName",
        "lastName",
        "findName",
        "jobTitle",
        "gender",
        "prefix",
        "suffix",
        "title",
        "jobDescriptor",
        "jobArea",
        "jobType"
    ],
    phone: ["phoneNumber", "phoneNumberFormat", "phoneFormats"],
    random: [
        "number",
        "float",
        "uuid",
        "boolean",
        "word",
        "words",
        "image",
        "locale",
        "alpha",
        "alphaNumeric",
        "hexaDecimal"
    ],
    system: [
        "fileName",
        "commonFileName",
        "mimeType",
        "commonFileType",
        "commonFileExt",
        "fileType",
        "fileExt",
        "directoryPath",
        "filePath",
        "semver"
    ],
    vehicle: ["vehicle", "manufacturer", "model", "type", "fuel", "vin", "color"]
};
