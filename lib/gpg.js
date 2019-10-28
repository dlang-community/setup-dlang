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
const tc = __importStar(require("@actions/tool-cache"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const aexec = util_1.promisify(child_process_1.exec);
function verify(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const keyring = yield tc.downloadTool("https://dlang.org/d-keyring.gpg");
        const result = yield aexec(`gpg --verify --keyring ${keyring} --no-default-keyring ${path}`);
        console.log(result.stdout);
    });
}
exports.verify = verify;
