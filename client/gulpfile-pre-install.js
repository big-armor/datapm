
function cleanNodeGyp() {
    if (process.platform === "win32") {
        const path = `${process.env.LOCALAPPDATA}/node-gyp/Cache`;

        // https://github.com/bugsnag/bugsnag-js/issues/1593#issuecomment-1022640647
        console.log("Cleaning node-gyp/Cache directory at " + path);

        if (fs.existsSync(path)) {
            del(path);
            console.log("node-gyp/Cache directory cleaned");
        } else {
            console.log("node-gyp/Cache directory does not exist at " + path);
        }
    } else {
        console.log("Not windows");
    }

    return Promise.resolve();
}


exports.default = cleanNodeGyp;
