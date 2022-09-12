import * as tc from '@actions/tool-cache';
import { body_as_text } from './utils';

export interface CompilerDescription {
    name: string;
    version: string;
    url: string;
    binpath: string;
    libpath : string[];
    sig?: string;
    dub?: DubDescription;
}

export interface DubDescription {
    url: string;
    version: string;
}

export async function compiler(description: string, dub_vers: string, gh_token: string): Promise<CompilerDescription> {
    const matches = description.match(/^(\w+)-(.+)$/);
    if (!matches) throw new Error("invalid compiler string: " + description);

    switch (matches[1]) {
        case "dmd": return await dmd(matches[2], dub_vers, gh_token);
        case "ldc": return await ldc(matches[2], dub_vers, gh_token);
        default: throw new Error("unrecognized compiler: " + matches[1]);
    }
}

async function dub(version: string, gh_token: string, legacy: boolean): Promise<DubDescription | undefined> {
    // No explicit version from the user
    if (!version.length) {
        // We use the version bundled with the compiler
        if (!legacy) return undefined;

        // download some dub version for legacy compilers not shipping dub
        // this is the last version on the old download page from September 2018
        switch (process.platform) {
            case "win32": return {
                version: "1.11.0",
                url: "https://code.dlang.org/files/dub-1.11.0-windows-x86.zip"
            };
            case "linux": return {
                version: "1.11.0",
                url: "https://code.dlang.org/files/dub-1.11.0-linux-x86_64.tar.gz"
            };
            case "darwin": return {
                version: "1.11.0",
                url: "https://code.dlang.org/files/dub-1.11.0-osx-x86_64.tar.gz"
            };
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
    }

    if (version ===  "latest") {
        if (!gh_token)
            throw new Error("'gh_token' parameter must be set to use dub latest version");

        let json = await body_as_text(
            `https://api.github.com/repos/dlang/dub/releases/latest`,
            gh_token
        );
        let rname = JSON.parse(json)["name"];
        if (rname == undefined) {
            console.log(json)
            throw new Error("Couldn't load release name for dub latest version");
        }
        console.log("Using DUB latest version: ", rname);
        version = rname;
    }

    const matches = version.match(/^v?(1\.\d+\.\d+)(-.+)?$/);
    if (!matches)
        throw new Error("unrecognized DUB version: '" + version +
            "'. Make sure to use the dub version, and not the frontend one.");
    if (matches[2])
        throw new Error("only release versions of DUB are supported, not: " + version)
    version = "v" + matches[1];

    switch (process.platform) {
        case "win32": return {
            version: version,
            url: `https://github.com/dlang/dub/releases/download/${version}/dub-${version}-windows-x86_64.zip`
        };
        case "linux": return {
            version: version,
            url: `https://github.com/dlang/dub/releases/download/${version}/dub-${version}-linux-x86_64.tar.gz`
        };
        case "darwin": return {
            version: version,
            url: `https://github.com/dlang/dub/releases/download/${version}/dub-${version}-osx-x86_64.tar.gz`
        };
        default:
            throw new Error("unsupported platform: " + process.platform);
    }
}

async function dmd(version: string, dub_vers: string, gh_token: string): Promise<CompilerDescription> {
    let beta = false;

    switch (version) {
        case "latest":
            version = await body_as_text("https://downloads.dlang.org/releases/LATEST");
            break;
        case "beta":
            version = await body_as_text("https://downloads.dlang.org/pre-releases/LATEST");
            beta = true;
            break;
    }

    const matches = version.match(/^(2\.(\d+)\.\d+)(-.+)?$/);
    if (version != "master" && !matches)
        throw new Error("unrecognized DMD version: " + version);

    let folder = beta ? matches![1] : version;

    const nightly = version == "master";
    const minor = nightly ? undefined : parseInt(matches![2]);
    let universal = false;
    if (minor !== undefined && minor < 65) {
        if (version.endsWith(".0")) {
            version = version.slice(0, -2);
        }
        folder = version.match(/^2\.\d+/)![0];
        universal = true;
    }

    const base_url = nightly ?
        `https://github.com/dlang/dmd/releases/download/nightly/dmd.${version}`
        : beta ? `https://downloads.dlang.org/pre-releases/2.x/${folder}/dmd.${version}`
            : `https://downloads.dlang.org/releases/2.x/${folder}/dmd.${version}`;

    const legacy = (minor !== undefined && minor < 72);

    switch (process.platform) {
        case "win32": return {
            name: "dmd",
            version: version,
            url: universal ? `${base_url}.zip`
                : minor !== undefined && minor < 69 ? `${base_url}.windows.zip`
                    : `${base_url}.windows.7z`,
            binpath: "\\dmd2\\windows\\bin",
            libpath: [ "\\dmd2\\windows\\bin64" ],
            dub: await dub(dub_vers, gh_token, legacy),
            // Signatures for nightly releases are not available (yet?)
            sig: nightly ? undefined : `${base_url}.windows.7z.sig`
        };
        case "linux": return {
            name: "dmd",
            version: version,
            url: universal ? `${base_url}.zip`
                : minor !== undefined && minor < 69 ? `${base_url}.linux.zip`
                    : `${base_url}.linux.tar.xz`,
            binpath: "/dmd2/linux/bin64",
            libpath: [ "/dmd2/linux/lib64" ],
            dub: await dub(dub_vers, gh_token, legacy),
            sig: nightly ? undefined : `${base_url}.linux.tar.xz.sig`
        };
        case "darwin": return {
            name: "dmd",
            version: version,
            url: universal ? `${base_url}.zip`
                : minor !== undefined && minor < 69 ? `${base_url}.osx.zip`
                    : `${base_url}.osx.tar.xz`,
            binpath: "/dmd2/osx/bin",
            libpath: [ "/dmd2/linux/lib64" ],
            dub: await dub(dub_vers, gh_token, legacy),
            sig: nightly ? undefined : `${base_url}.osx.tar.xz.sig`
        };
        default:
            throw new Error("unsupported platform: " + process.platform);
    }
}

async function ldc_resolve_master(gh_token: string): Promise<CompilerDescription> {
    let suffix, ext;

    switch (process.platform) {
        case "win32": suffix = 'windows-multilib'; ext = '7z'; break;
        case "linux": suffix = 'linux-x86_64'; ext = 'tar.xz'; break;
        case "darwin": suffix = 'osx-universal'; ext = 'tar.xz'; break;
        default:
            throw new Error("unsupported platform: " + process.platform);
    }

    if (!gh_token)
        throw new Error("'gh_token' parameter must be set to use ldc-master");

    let json = await body_as_text(
        `https://api.github.com/repos/LDC-Developers/LDC/releases/tags/CI`,
        gh_token
    );
    let assets = JSON.parse(json)["assets"];
    if (assets == undefined) {
        console.log(json)
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
        .map(function(asset) {
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
        .filter(function(asset) {
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
        libpath: [ `${base_path}lib64` ]
    };
}

async function ldc(version: string, dub_vers: string, gh_token: string): Promise<CompilerDescription> {
    switch (version) {
        case "latest":
            version = await body_as_text("https://ldc-developers.github.io/LATEST");
            break;
        case "beta":
            version = await body_as_text("https://ldc-developers.github.io/LATEST_BETA");
            break;
        case "master":
            return await ldc_resolve_master(gh_token);
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
            libpath: [ `\\ldc2-${version}-windows-multilib\\lib64` ],
            dub: await dub(dub_vers, gh_token, false)
        };
        case "linux": return {
            name: "ldc2",
            version: version,
            url: `${base_url}-linux-x86_64.tar.xz`,
            binpath: `/ldc2-${version}-linux-x86_64/bin`,
            libpath: [ `/ldc2-${version}-linux-x86_64/lib64` ],
            dub: await dub(dub_vers, gh_token, false)
        };
        case "darwin": return {
            name: "ldc2",
            version: version,
            url: `${base_url}-osx-universal.tar.xz`,
            binpath: `/ldc2-${version}-osx-universal/bin`,
            libpath: [ `/ldc2-${version}-osx-universal/lib-arm64`, `/ldc2-${version}-osx-universal/lib-x86_64` ],
            dub: await dub(dub_vers, gh_token, false)
        };
        default:
            throw new Error("unsupported platform: " + process.platform);
    }
}
