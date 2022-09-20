import moment from "moment";
import { HTTPContext } from "../context";
import { CatalogRepository } from "../repository/CatalogRepository";
import { CollectionRepository } from "../repository/CollectionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { getEnvVariable } from "./getEnvVariable";

const LIMIT = 50000;
const DATE_FORMAT = "YYYY-MM-DDThh:mm:ssZ";

export async function generateSiteMapIndex(context: HTTPContext): Promise<string> {
    let responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    responseXml += `
        <sitemap>
            <loc>${getEnvVariable("REGISTRY_URL")}/sitemap_static.xml</loc>
        </sitemap>
    `;

    const publicPackagesCount = await context.connection.getCustomRepository(PackageRepository).countPublicPackages();

    const packageSiteMapCount = Math.ceil(publicPackagesCount / LIMIT);

    for (let i = 0; i < packageSiteMapCount; i++) {
        responseXml += `
    <sitemap>
        <loc>${getEnvVariable("REGISTRY_URL")}/sitemap_packages_${i}.xml</loc>
    </sitemap>
`;
    }

    const catalogSiteMapCount = await context.connection.getCustomRepository(CatalogRepository).countPublicCatalogs();

    const catalogsSiteMapCount = Math.ceil(catalogSiteMapCount / LIMIT);

    for (let i = 0; i < catalogsSiteMapCount; i++) {
        responseXml += `
    <sitemap>
        <loc>${getEnvVariable("REGISTRY_URL")}/sitemap_catalogs_${i}.xml</loc>
    </sitemap>
`;
    }

    const collectionSiteMapCount = await context.connection
        .getCustomRepository(CollectionRepository)
        .countPublicCollections();

    const collectionsSiteMapCount = Math.ceil(collectionSiteMapCount / LIMIT);

    for (let i = 0; i < collectionsSiteMapCount; i++) {
        responseXml += `
    <sitemap>
        <loc>${getEnvVariable("REGISTRY_URL")}/sitemap_collections_${i}.xml</loc>
    </sitemap>
`;
    }

    responseXml += `
</sitemapindex>
`;

    return responseXml;
}

export async function generateStaticSiteMap(): Promise<string> {
    // XML header
    let responseXml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">        
    `;

    responseXml += `
    <url>
        <loc>${getEnvVariable("REGISTRY_URL")}</loc>
        <lastmod>${moment().format(DATE_FORMAT)}</lastmod>
    </url>
    <url>
        <loc>${getEnvVariable("REGISTRY_URL")}/docs</loc>
        <lastmod>${moment().format(DATE_FORMAT)}</lastmod>
    </url>
    <url>
        <loc>${getEnvVariable("REGISTRY_URL")}/privacy</loc>
        <lastmod>${moment().format(DATE_FORMAT)}</lastmod>
    </url>
    <url>
        <loc>${getEnvVariable("REGISTRY_URL")}/terms</loc>
        <lastmod>${moment().format(DATE_FORMAT)}</lastmod>
    </url>
    <url>
        <loc>${getEnvVariable("REGISTRY_URL")}/contact</loc>
        <lastmod>${moment().format(DATE_FORMAT)}</lastmod>
    </url>
    <url>
        <loc>${getEnvVariable("REGISTRY_URL")}/downloads</loc>
        <lastmod>${moment().format(DATE_FORMAT)}</lastmod>
    </url>
`;

    responseXml += `
    </urlset>
    `;

    return responseXml;
}
export async function generatePackageSiteMap(siteMapNumber: number, context: HTTPContext): Promise<string> {
    const offset = siteMapNumber * LIMIT;

    const publicPackages = await context.connection
        .getCustomRepository(PackageRepository)
        .getPublicPackages(50000, offset, ["catalog"]);

    // XML header
    let responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">        
`;

    for (const packageEntity of publicPackages) {
        const date = moment(packageEntity.updatedAt).format(DATE_FORMAT);

        responseXml += `
    <url>
        <loc>${getEnvVariable("REGISTRY_URL")}/${packageEntity.catalog.slug}/${packageEntity.slug}</loc>
        <lastmod>${date}</lastmod>
    </url>
`;
    }

    responseXml += `
</urlset>
`;

    return responseXml;
}

export async function generateCatalogSiteMap(siteMapNumber: number, context: HTTPContext): Promise<string> {
    const offset = siteMapNumber * LIMIT;

    const publicCatalogs = await context.connection
        .getCustomRepository(CatalogRepository)
        .getPublicCatalogs(50000, offset);

    // XML header
    let responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">        
`;

    for (const catalogEntity of publicCatalogs) {
        const date = moment(catalogEntity.updatedAt).format(DATE_FORMAT);

        responseXml += `
    <url>
        <loc>${getEnvVariable("REGISTRY_URL")}/${catalogEntity.slug}</loc>
        <lastmod>${date}</lastmod>
    </url>
`;
    }

    responseXml += `
</urlset>
`;

    return responseXml;
}

export async function generateCollectionsSiteMap(siteMapNumber: number, context: HTTPContext): Promise<string> {
    const offset = siteMapNumber * LIMIT;

    const publicCollections = await context.connection
        .getCustomRepository(CollectionRepository)
        .getPublicCollections(50000, offset);

    // XML header
    let responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">        
`;

    for (const collectionEntity of publicCollections) {
        const date = moment(collectionEntity.updatedAt).format(DATE_FORMAT);

        responseXml += `
    <url>
        <loc>${getEnvVariable("REGISTRY_URL")}/collection/${collectionEntity.collectionSlug}</loc>
        <lastmod>${date}</lastmod>
    </url>
`;
    }

    responseXml += `
</urlset>
`;

    return responseXml;
}
