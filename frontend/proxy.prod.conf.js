const PROXY_CONFIG = [
    {
        context: [
            "/assets",
            "/static",
            "/graphql",
            "/ws",
            "/images",
            "/proxy",
            "/client-installers",
            "/sitemap.xml",
            "/robots.txt",
            "/docs"
        ],
        target: "https://datapm.io",
        secure: true,
        changeOrigin: true
    },
    {
        context: [
            "*"
        ], 
        bypass: (req, res, proxyOptions) => {
            res.setHeader('x-datapm-version', 'local-dev');
            res.setHeader('x-datapm-registry-url', 'http: //localhost:4200');
        }
    }
]

module.exports = PROXY_CONFIG;