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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const gpg = __importStar(require("./gpg"));
const compiler_1 = require("./compiler");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (process.arch != "x64")
                throw new Error("Only x64 arch is supported by all platforms");
            const input = core.getInput('compiler') || "dmd-latest";
            const descr = yield compiler_1.compiler(input);
            console.log(`Enabling ${input}`);
            const cache_tag = descr.name + "-" + descr.version + (descr.download_dub ? "+dub" : "");
            let cached = tc.find('dc', cache_tag);
            if (cached) {
                console.log("Using cache");
            }
            else {
                console.log(`Downloading ${descr.url}`);
                const archive = yield tc.downloadTool(descr.url);
                gpg.verify(archive);
                const dc_path = yield extract(descr.url, archive);
                if (descr.download_dub) {
                    const dub = yield compiler_1.legacyDub();
                    const archive2 = yield tc.downloadTool(dub.url);
                    yield extract(dub.url, archive2, dc_path + descr.binpath);
                }
                cached = yield tc.cacheDir(dc_path, 'dc', cache_tag);
            }
            core.addPath(cached + descr.binpath);
            core.exportVariable("DC", descr.name);
            console.log("Done");
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function extract(format, archive, into) {
    return __awaiter(this, void 0, void 0, function* () {
        if (format.endsWith(".7z"))
            return yield tc.extract7z(archive, into);
        else if (format.endsWith(".zip"))
            return yield tc.extractZip(archive, into);
        else if (/\.tar(\.\w+)?$/.test(format))
            return yield tc.extractTar(archive, into, 'x');
        throw new Error("unsupported archive format: " + format);
    });
}
run();
