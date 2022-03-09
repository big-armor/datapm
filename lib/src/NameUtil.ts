export function nameToSlug(name: string): string {
    const withDashes = name.toLowerCase().replace(/\W+/g, "-");

    const withoutSurroundingDashes = withDashes.replace(/^[-|_]+/g, "").replace(/[-|_]+$/g, "");

    const shortended = withoutSurroundingDashes.substr(0, 38);

    const withoutSurroundingDashes2 = shortended.replace(/^[-|_]+/g, "").replace(/[-|_]+$/g, "");

    return withoutSurroundingDashes2;
}
