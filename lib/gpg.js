"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.install = exports.verify = void 0;
const tc = __importStar(require("@actions/tool-cache"));
const promisify_child_process_1 = require("promisify-child-process");
// hack to workaround gpg on windows interaction with paths
function win_path_to_msys(path) {
    if (process.platform != "win32")
        return path;
    path = path.replace('\\', '/');
    const drive = path[0];
    path = '/' + drive + path.slice(2);
    return path;
}
function verify(file_path, sig_url) {
    return __awaiter(this, void 0, void 0, function* () {
        let keyring = yield tc.downloadTool("https://dlang.org/d-keyring.gpg");
        keyring = win_path_to_msys(keyring);
        let sig_path = yield tc.downloadTool(sig_url);
        sig_path = win_path_to_msys(sig_path);
        const gpg_process = promisify_child_process_1.spawn('gpg', ['--lock-never', '--verify', '--keyring', keyring, '--no-default-keyring',
            sig_path, file_path], {});
        gpg_process.stderr.pipe(process.stdout);
        gpg_process.stdout.pipe(process.stdout);
        // will throw for non-0 exit status
        yield gpg_process;
    });
}
exports.verify = verify;
function install() {
    return __awaiter(this, void 0, void 0, function* () {
        // other platforms have gpg pre-installed
        if (process.platform == "darwin") {
            const brew_process = promisify_child_process_1.spawn('brew', ['install', 'gnupg'], {});
            yield brew_process;
        }
    });
}
exports.install = install;
