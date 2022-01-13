const PROXY_CONFIG = [
    {
        context: [
            "/assets",
            "/static",
            "/docs",
            "/graphql",
            "/ws",
            "/images",
            "/proxy"
        ],
        target: "http://localhost:4000",
        secure: false,
        changeOrigin: true
    },
    {
        context: [
            "*"
        ], 
        bypass: (req, res, proxyOptions) => {
            res.setHeader('x-datapm-version', 'local-dev');
        }
    }
]

module.exports = PROXY_CONFIG;