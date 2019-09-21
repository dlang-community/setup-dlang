"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
function compiler(description) {
    return __awaiter(this, void 0, void 0, function* () {
        const matches = description.match(/^(\w+)-(.+)$/);
        if (!matches)
            throw new Error("invalid compiler string: " + description);
        switch (matches[1]) {
            case "dmd": return yield dmd(matches[2]);
            case "ldc": return yield ldc(matches[2]);
            default: throw new Error("unrecognized compiler: " + matches[1]);
        }
    });
}
exports.compiler = compiler;
function legacyDub() {
    return __awaiter(this, void 0, void 0, function* () {
        // download some dub version for legacy compilers not shipping dub
        // this is the last version on the old download page from September 2018
        switch (process.platform) {
            case "win32": return {
                url: "https://code.dlang.org/files/dub-1.11.0-windows-x86.zip"
            };
            case "linux": return {
                url: "https://code.dlang.org/files/dub-1.11.0-linux-x86_64.tar.gz"
            };
            case "darwin": return {
                url: "https://code.dlang.org/files/dub-1.11.0-osx-x86_64.tar.gz"
            };
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
    });
}
exports.legacyDub = legacyDub;
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
        const matches = version.match(/^(2\.(\d+)\.\d+)(-.+)?$/);
        if (version != "master" && !matches)
            throw new Error("unrecognized DMD version: " + version);
        let folder = beta ? matches[1] : version;
        const minor = version == "master" ? undefined : parseInt(matches[2]);
        let universal = false;
        if (minor !== undefined && minor < 65) {
            if (version.endsWith(".0")) {
                version = version.slice(0, -2);
            }
            folder = version.match(/^2\.\d+/)[0];
            universal = true;
        }
        const base_url = version == "master" ?
            `http://downloads.dlang.org/nightlies/dmd-master/dmd.${version}`
            : beta ? `http://downloads.dlang.org/pre-releases/2.x/${folder}/dmd.${version}`
                : `http://downloads.dlang.org/releases/2.x/${folder}/dmd.${version}`;
        const download_dub = minor !== undefined && minor < 72;
        switch (process.platform) {
            case "win32": return {
                name: "dmd",
                version: version,
                url: universal ? `${base_url}.zip`
                    : minor !== undefined && minor < 69 ? `${base_url}.windows.zip`
                        : `${base_url}.windows.7z`,
                binpath: "\\dmd2\\windows\\bin",
                download_dub: download_dub
            };
            case "linux": return {
                name: "dmd",
                version: version,
                url: universal ? `${base_url}.zip`
                    : minor !== undefined && minor < 69 ? `${base_url}.linux.zip`
                        : `${base_url}.linux.tar.xz`,
                binpath: "/dmd2/linux/bin64",
                download_dub: download_dub
            };
            case "darwin": return {
                name: "dmd",
                version: version,
                url: universal ? `${base_url}.zip`
                    : minor !== undefined && minor < 69 ? `${base_url}.osx.zip`
                        : `${base_url}.osx.tar.xz`,
                binpath: "/dmd2/osx/bin",
                download_dub: download_dub
            };
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
    });
}
function ldc(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let ci = false;
        switch (version) {
            case "latest":
                version = yield utils_1.body_as_text("https://ldc-developers.github.io/LATEST");
                break;
            case "beta":
                version = yield utils_1.body_as_text("https://ldc-developers.github.io/LATEST_BETA");
                break;
            case "master":
                // see https://github.com/ldc-developers/ldc/releases/tag/CI
                // http to avoid certificate issues as we are only grabbing a commit hash that must be available as github release anyway
                const links = yield utils_1.body_as_text("http://thecybershadow.net/d/github-ldc/");
                // we don't simply trust the links in this endpoint!
                if (!links.startsWith("https://github.com/ldc-developers/ldc/releases/download/CI/ldc-"))
                    throw new Error("Unexpected response from CyberShadow LDC API endpoint");
                version = links.substr("https://github.com/ldc-developers/ldc/releases/download/CI/ldc-".length, 8);
                ci = true;
                break;
        }
        if (!ci && !version.match(/^(\d+)\.(\d+)\.(\d+)/))
            throw new Error("unrecognized LDC version: " + version);
        const base_url = ci ?
            `https://github.com/ldc-developers/ldc/releases/download/CI/ldc2-${version}`
            : `https://github.com/ldc-developers/ldc/releases/download/v${version}/ldc2-${version}`;
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
