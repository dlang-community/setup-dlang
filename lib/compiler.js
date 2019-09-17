"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
function compiler(description) {
    return __awaiter(this, void 0, void 0, function* () {
        const matches = description.match(/(\w+)-(.+)/);
        if (!matches)
            throw new Error("invalid compiler string: " + description);
        switch (matches[1]) {
            case "dmd": return dmd(matches[2]);
            case "ldc": return yield ldc(matches[2]);
            default: throw new Error("unrecognized compiler: " + matches[1]);
        }
    });
}
exports.compiler = compiler;
function dmd(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let beta = false;
        switch (version) {
            case "latest":
                version = yield utils_1.body_as_text("http://downloads.dlang.org/releases/LATEST");
                break;
            case "beta":
                version = yield utils_1.body_as_text("http://downloads.dlang.org/pre-releases/LATEST");
                beta = true;
                break;
        }
        const matches = version.match(/(2.\d+.\d+)(-.+)?/);
        if (!matches)
            throw new Error("unrecognized DMD version: " + version);
        const base_url = beta ?
            `http://downloads.dlang.org/pre-releases/2.x/${matches[1]}/dmd.${version}`
            : `http://downloads.dlang.org/releases/2.x/${version}/dmd.${version}`;
        switch (process.platform) {
            case "win32": return {
                name: "dmd",
                version: version,
                url: `${base_url}.windows.7z`,
                binpath: "\\dmd2\\windows\\bin"
            };
            case "linux": return {
                name: "dmd",
                version: version,
                url: `${base_url}.linux.tar.xz`,
                binpath: "/dmd2/linux/bin64"
            };
            case "darwin": return {
                name: "dmd",
                version: version,
                url: `${base_url}.osx.tar.xz`,
                binpath: "/dmd2/osx/bin/"
            };
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
    });
}
function ldc(version) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (version) {
            case "latest":
                version = yield utils_1.body_as_text("https://ldc-developers.github.io/LATEST");
                break;
            case "beta":
                version = yield utils_1.body_as_text("https://ldc-developers.github.io/LATEST_BETA");
                break;
        }
        if (!version.match(/(\d+).(\d+).(\d+)/))
            throw new Error("unrecognized LDC version: " + version);
        const base_url = `https://github.com/ldc-developers/ldc/releases/download/v${version}/ldc2-${version}`;
        switch (process.platform) {
            case "win32": return {
                name: "ldc2",
                version: version,
                url: `${base_url}-windows-multilib.7z`,
                binpath: `\\ldc2-${version}-windows-multilib\\bin`
            };
            case "linux": return {
                name: "ldc2",
                version: version,
                url: `${base_url}-linux-x86_64.tar.xz`,
                binpath: `/ldc2-${version}-linux-x86_64/bin`
            };
            case "darwin": return {
                name: "ldc2",
                version: version,
                url: `${base_url}-osx-x86_64.tar.xz`,
                binpath: `/ldc2-${version}-osx-x86_64/bin`
            };
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
    });
}
