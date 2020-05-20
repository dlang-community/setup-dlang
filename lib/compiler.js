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
exports.legacyDub = exports.compiler = void 0;
const utils_1 = require("./utils");
function compiler(description, gh_token) {
    return __awaiter(this, void 0, void 0, function* () {
        const matches = description.match(/^(\w+)-(.+)$/);
        if (!matches)
            throw new Error("invalid compiler string: " + description);
        switch (matches[1]) {
            case "dmd": return yield dmd(matches[2]);
            case "ldc": return yield ldc(matches[2], gh_token);
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
                libpath: "\\dmd2\\windows\\lib64",
                download_dub: download_dub,
                sig: `${base_url}.windows.7z.sig`
            };
            case "linux": return {
                name: "dmd",
                version: version,
                url: universal ? `${base_url}.zip`
                    : minor !== undefined && minor < 69 ? `${base_url}.linux.zip`
                        : `${base_url}.linux.tar.xz`,
                binpath: "/dmd2/linux/bin64",
                libpath: "/dmd2/linux/lib64",
                download_dub: download_dub,
                sig: `${base_url}.linux.tar.xz.sig`
            };
            case "darwin": return {
                name: "dmd",
                version: version,
                url: universal ? `${base_url}.zip`
                    : minor !== undefined && minor < 69 ? `${base_url}.osx.zip`
                        : `${base_url}.osx.tar.xz`,
                binpath: "/dmd2/osx/bin",
                libpath: "/dmd2/linux/lib64",
                download_dub: download_dub,
                sig: `${base_url}.osx.tar.xz.sig`
            };
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
    });
}
function ldc_resolve_master(gh_token) {
    return __awaiter(this, void 0, void 0, function* () {
        let suffix, ext;
        switch (process.platform) {
            case "win32":
                suffix = 'windows-multilib';
                ext = '7z';
                break;
            case "linux":
                suffix = 'linux-x86_64';
                ext = 'tar.xz';
                break;
            case "darwin":
                suffix = 'osx-x86_64';
                ext = 'tar.xz';
                break;
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
        if (!gh_token)
            throw new Error("'gh_token' parameter must be set to use ldc-master");
        let json = yield utils_1.body_as_text(`https://api.github.com/repos/LDC-Developers/LDC/releases/tags/CI`, gh_token);
        let assets = JSON.parse(json)["assets"];
        if (assets == undefined) {
            console.log(json);
            throw new Error("Couldn't load assets json");
        }
        if (assets.length == 0)
            throw new Error("No assets found for LDC CI release");
        assets.sort(function (a, b) {
            const date_a = Date.parse(a["updated_at"]);
            const date_b = Date.parse(b["updated_at"]);
            return date_a > date_b ? -1 : 1;
        });
        assets = assets
            .map(function (asset) {
            const name = asset["name"];
            const matches = name.match(/^ldc2?-([0-9a-fA-F]{5,12})[-.](.+)/);
            if (!matches)
                throw new Error(`Unexpected naming format for the latest LDC asset: ${name}`);
            return {
                name: matches[0],
                version: matches[1],
                suffix: matches[2]
            };
        })
            .filter(function (asset) {
            return asset.suffix == `${suffix}.${ext}`;
        });
        const latest = assets[0];
        const base_path = (process.platform == "win32") ?
            `\\ldc2-${latest.version}-${suffix}\\` :
            `/ldc2-${latest.version}-${suffix}/`;
        return {
            name: "ldc2",
            version: latest.version,
            url: "https://github.com/ldc-developers/ldc/releases/download/CI/" + latest.name,
            binpath: `${base_path}bin`,
            libpath: `${base_path}lib64`
        };
    });
}
function ldc(version, gh_token) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (version) {
            case "latest":
                version = yield utils_1.body_as_text("https://ldc-developers.github.io/LATEST");
                break;
            case "beta":
                version = yield utils_1.body_as_text("https://ldc-developers.github.io/LATEST_BETA");
                break;
            case "master":
                return yield ldc_resolve_master(gh_token);
        }
        if (!version.match(/^(\d+)\.(\d+)\.(\d+)/))
            throw new Error("unrecognized LDC version: " + version);
        const base_url = `https://github.com/ldc-developers/ldc/releases/download/v${version}/ldc2-${version}`;
        switch (process.platform) {
            case "win32": return {
                name: "ldc2",
                version: version,
                url: `${base_url}-windows-multilib.7z`,
                binpath: `\\ldc2-${version}-windows-multilib\\bin`,
                libpath: `\\ldc2-${version}-windows-multilib\\lib64`
            };
            case "linux": return {
                name: "ldc2",
                version: version,
                url: `${base_url}-linux-x86_64.tar.xz`,
                binpath: `/ldc2-${version}-linux-x86_64/bin`,
                libpath: `/ldc2-${version}-linux-x86_64/lib64`
            };
            case "darwin": return {
                name: "ldc2",
                version: version,
                url: `${base_url}-osx-x86_64.tar.xz`,
                binpath: `/ldc2-${version}-osx-x86_64/bin`,
                libpath: `/ldc2-${version}-osx-x86_64/lib64`
            };
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
    });
}
