const fs = require("node:fs");
if (fs.existsSync(".env")) process.loadEnvFile(".env");
require("../server.js");