export function validateCollectionSlug(slug: string): boolean {
    const regExp = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

    if (slug === undefined) return false;

    return !!slug.match(regExp);
}
