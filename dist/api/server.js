"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// includes
const cmd = require("commander");
const dotenv = require("dotenv");
const express = require("express");
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
const globalExt = __importStar(require("../lib/global-ext"));
// promisify
const readdirAsync = util.promisify(fs.readdir);
// configure express
const app = express();
// define command line parameters
let doStartup = true;
cmd.option('-l, --log-level <s>', `LOG_LEVEL. The minimum level to log (error, warn, info, verbose, debug, silly). Defaults to "info".`, /^(error|warn|info|verbose|debug|silly)$/i)
    .option('-p, --port <i>', '[REQUIRED] PORT. The port that will host the API.', parseInt)
    .option('-V, --version', 'Displays the version.')
    .on('option:version', async () => {
    doStartup = false;
    console.log(await global.version());
    process.exit(0);
})
    .parse(process.argv);
// globals
dotenv.config();
const LOG_LEVEL = cmd.logLevel || process.env.LOG_LEVEL || 'info';
const PORT = cmd.port || process.env.PORT || 8112;
// enable logging
globalExt.enableLogging(LOG_LEVEL);
// startup
if (doStartup) {
    // log startup
    console.log(`LOG_LEVEL = "${LOG_LEVEL}".`);
    global.logger.verbose(`PORT = "${PORT}".`);
    // check requirements
    if (!PORT) {
        throw new Error('You must specify a PORT.');
    }
    // startup
    (async () => {
        // mount all routes
        const routePaths = await readdirAsync(`${__dirname}/routes`);
        for (const routePath of routePaths) {
            global.logger.verbose(`mounting routes for "${routePath}"...`);
            require(`${__dirname}/routes/${routePath}`)(app);
            global.logger.verbose(`mounted routes for "${routePath}".`);
        }
        // start listening
        app.listen(PORT, () => {
            global.logger.verbose(`listening on port ${PORT}...`);
            if (process.send) {
                console.log('sent "listening" from API to test rig.');
                process.send('listening');
            }
        });
    })().catch(error => {
        global.logger.error(error.stack);
    });
}
