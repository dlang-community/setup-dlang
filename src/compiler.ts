import * as tc from '@actions/tool-cache';
import { body_as_text } from './utils';

export interface CompilerDescription {
    name: string;
    version: string;
    url: string;
    binpath: string;
}

export async function compiler(description: string): Promise<CompilerDescription> {
    const matches = description.match(/(\w+)-(.+)/);
    if (!matches) throw new Error("invalid compiler string: " + description);

    switch (matches[1]) {
        case "dmd": return dmd(matches[2]);
        case "ldc": return await ldc(matches[2]);
        default: throw new Error("unrecognized compiler: " + matches[1]);
    }
}

async function dmd(version: string): Promise<CompilerDescription> {
    let beta = false;

    switch (version) {
        case "latest":
		    version = await body_as_text("http://downloads.dlang.org/releases/LATEST");
		    break;
		case "beta":
            version = await body_as_text("http://downloads.dlang.org/pre-releases/LATEST");
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
}

async function ldc(version: string): Promise<CompilerDescription> {
    switch (version) {
        case "latest":
            version = await body_as_text("https://ldc-developers.github.io/LATEST");
            break;
        case "beta":
            version = await body_as_text("https://ldc-developers.github.io/LATEST_BETA");
	        break;
    }     
    
    if (!version.match(/(\d+).(\d+).(\d+)/))
	    throw new Error("unrecognized LDC version: " + version);
    
    const base_url =  `https://github.com/ldc-developers/ldc/releases/download/v${version}/ldc2-${version}`;

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
}