// Quick and dirty script to export NODE_EXTRA_CA_CERTS
// It cannot be used after startup: https://github.com/nodejs/node/issues/20434
const fs = require('fs');
const path = require('path');
const process = require('process');
// First arg is a file name, hence the double ".."
fs.appendFileSync(process.env.GITHUB_ENV, "NODE_EXTRA_CA_CERTS=" +
                  path.resolve(process.argv[1], "../../cert/lets_encrypt_intermediate.pem") + "\n");
