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
const compiler_1 = require("./compiler");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (process.arch != "x64")
                throw new Error("Only x64 arch is supported by all platforms");
            const input = core.getInput('compiler');
            const descr = yield compiler_1.compiler(input);
            console.log(`Enabling ${input}`);
            let cached = tc.find('dc', input);
            if (cached) {
                console.log("Using cache");
            }
            else {
                console.log(`Downloading ${descr.url}`);
                const archive = yield tc.downloadTool(descr.url);
                const dc_path = yield extract(archive);
                cached = yield tc.cacheDir(dc_path, 'dc', input);
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
function extract(archive) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (process.platform) {
            case "win32":
                return yield tc.extract7z(archive);
            case "linux":
            case "darwin":
                return yield tc.extractTar(archive, undefined, 'x');
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
    });
}
run();
