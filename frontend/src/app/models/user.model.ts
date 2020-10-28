export interface User {
    username: string;
    firstName?: string;
    lastName?: string;
    location?: string;
    twitterHandle?: string;
    description?: string;
    website?: string;
    emailAddress?: string;
    gitHubHandle?: string;
    nameIsPublic?: boolean;
    locationIsPublic?: boolean;
    twitterHandleIsPublic?: boolean;
    gitHubHandleIsPublic?: boolean;
    emailAddressIsPublic?: boolean;
    websiteIsPublic?: boolean;
}
