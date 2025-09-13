import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'
import * as gpg from './gpg'
import * as utils from './utils'
import * as fs from 'fs';
import * as semver from './semver'
import * as exec from '@actions/exec'

const sep = (process.platform == 'win32' ? '\\' : '/')
const exeExt = (process.platform == 'win32' ? '.exe' : '')

export const SETTINGS = {
    verify_sig: core.getInput('verify_sig') !== 'false'
}

/** Base interface for all D tools */
export interface ITool {
    makeAvailable(): Promise<void>
}

/**
   A base class for a D compiler
*/
export class Compiler implements ITool {
    /** The url to the compiler's release archive */
    public url: string
    /** An optional signature used to verify the archive */
    public sig?: string
    /** The compiler's name, used for caching */
    public name: string
    /** The compiler's version, used for caching */
    public version: string
    /** The sub-folder of the archive in which the compiler binary + tools reside

	The path should start with the system path separator and be
	relative to the archive root.

	@example "/dmd2/linux/bin64"
     */
    public binPath: string
    /** A list of sub-folders in the archive that contains the compiler's libraries

	The paths should start with the system path separator (/ or
	\\) and be relative to the archive root.
    */
    public libPaths: string[]
    /** the dmd-wrapper executable basename, without any extension.

	Example: 'ldmd2', 'dmd-2.109'
    */
    public dmdWrapperExeName: string


    constructor(url: string,
		sig: string | undefined,
		name: string,
		version: string,
		binPath: string,
		libPaths: string[],
		dmdWrapperExeName: string,
	       ){
	this.url = url
	this.sig = sig
	this.name = name
	this.version = version
	this.binPath = binPath
	this.libPaths = libPaths
	this.dmdWrapperExeName = dmdWrapperExeName
    }

    /** Add the binPath to PATH */
    addBinPath(root: string) {
	let path = root + this.binPath
	console.log(`Adding '${path}' to PATH`)
	core.addPath(path)
    }

    /** Add libPaths to the system library path */
    addLibPaths(root: string) {
	this.libPaths.forEach(function(libPath) {
	    let path = root + libPath
	    if (fs.existsSync(path)) {
		console.log(`Adding '${path}' to library path`)

		if (process.platform == "win32") {
		    core.addPath(path)
		} else {
		    let LD_LIBRARY_PATH = process.env["LD_LIBRARY_PATH"] || ""
		    if (LD_LIBRARY_PATH.length > 0) {
			LD_LIBRARY_PATH = path + ":" + LD_LIBRARY_PATH
		    } else {
			LD_LIBRARY_PATH = path
		    }
		    core.exportVariable("LD_LIBRARY_PATH", LD_LIBRARY_PATH)
		}
	    }
	})
    }

    /** Get a path to the extracted archive after caching it */
    async getCached(): Promise<string> {
	let cached = tc.find(this.name, this.version);
	if (cached) {
	    console.log("Using cache")
	} else {
            console.log(`Downloading ${this.url}`);
        const archive = await utils.downloadTool(this.url)
            if (SETTINGS.verify_sig && this.sig) {
                console.log("Verifying the download with GPG");
                await gpg.verify(archive, this.sig);
            }
            let path = await utils.extract(this.url, archive);
	    cached = await tc.cacheDir(path, this.name, this.version);
	}

	return cached
    }

    /** Set the DC and DMD environment variable to point to the newly extracted compiler */
    setDC(root: string) {
	core.exportVariable("DC", root + this.binPath + sep + this.name + exeExt)
	core.exportVariable("DMD", root + this.binPath + sep + this.dmdWrapperExeName + exeExt)
    }

    /** Take all the necessary steps to make the compiler available on the host

	This means:
	- download it if this hasn't been done already
	- update PATH
	- update PATH/LD_LIBRARY_PATH
	- set $DC
	*/
    async makeAvailable() {
	let root = await this.getCached()
	this.addBinPath(root)
	this.addLibPaths(root)
	this.setDC(root)
    }
}

/**
   A class that encapsulated data needed to download a dmd version
   */
export class DMD extends Compiler {
    /**
       Parse a user provided version string and convert it to a DMD class

       The versionString parameter can be in the following formats:

       - 'dmd' or 'dmd-latest' or 'dmd-beta'. This names resolve to
       the highest available versions as specified on
       https://downloads.dlang.org/releases/LATEST or on
       https://downloads.dlang.org/pre-releases/LATEST. 'dmd' and
       'dmd-latest' use the former url, 'dmd-beta' uses the latter.
       In case the beta version is lower than the normal version the
       normal version is picked.

       - 'dmd-2.107.1'. This format resolves to
       https://downloads.dlang.org/releases/2.x/2.107.1/dmd.2.107.1.linux.tar.xz

       - 'dmd-2.107.0-beta.1'. This format resolves to
       https://downloads.dlang.org/pre-releases/2.x/2.107.0/dmd.2.107.0-beta.1.linux.tar.xz

       - 'dmd-2.106'. This format resolves to the highest patch release of minor
       version 106 (it would be 2.106.1). The result is computed using
       Github api so a token may be required.

       - 'dmd-2.106b'. This format resolves to the highest patch
       release (including release candidates) of minor version 2.106
       (it would be 2.106.1). The result is computed using Github api
       so a token may be required.

       - 'dmd^4'. This format resolves to 4 minor versions before
       latest. Example: If LATEST points to dmd-2.108.1 than this
       version resolves the same as 'dmd-2.104'.

       - 'dmd-master'. This format resolves to:
       https://github.com/dlang/dmd/releases/tag/nightly

       In the examples above the chosen versions are entirely
       arbitrary and anything higher or equal to dmd-2.065.0 is
       supported. Of course, platforms other than linux are also
       supported.

       All of the formats /except/ dmd-master come with a signature file.
     */
    static async initialize(versionString: string, token: string): Promise<DMD> {
	if (versionString == 'dmd-master') {
	    return await DMD.initializeFromMaster(token)
	}

	let [minor, patch, suffix] = await DMD.resolveVersion(versionString, token)
	let minorString = minor < 100 ? `0${minor}` : `${minor}`
	let name = 'dmd'
	let version = `2.${minorString}.${patch}${suffix}`
	let url: string
	if (suffix.length != 0) {
	    // Is a pre-release
	    url = `https://downloads.dlang.org/pre-releases/2.x/2.${minorString}.${patch}`
	} else
	    url = `https://downloads.dlang.org/releases/2.x/2.${minorString}.${patch}`
	url += `/dmd.${version}`

	return DMD.fromUrl(url, version, /*hasSigFile=*/true, minor)
    }

    /** Resolve a non dmd-master version

	See DMD.initialize for a more detailed example of the
	available formats for versionString

	@returns a tuple of the minor, patch and, optionally,
	pre-release suffix of the target version.
    */
    private static async resolveVersion(versionString: string, token: string)
    : Promise<[number, number, string]> {
	if (!versionString.startsWith("dmd")) {
	    throw Error(`DMD constructor called for a non-dmd version: '${versionString}'`)
	}

	let minor: number = 0, patch: number = 0
	let rcSuffix: string = ''
	let match;
	if ((match = versionString.match(/^dmd-2\.(\d+)\.(\d+)$/)) !== null) {
	    // 2.108.0
	    [, minor, patch] = match; minor = +minor
	} else if ((match = versionString.match(/^dmd-2\.(\d+)\.(\d+)(-\w+\.\d+)$/)) !== null) {
	    // 2.108.1-beta.2
	    [, minor, patch, rcSuffix] = match; minor = +minor
	} else if ((match = versionString.match(/^dmd-2\.(\d+)$/)) !== null) {
	    // 2.108
	    minor = parseInt(match[1]);
	    [patch]
		= await DMD.resolveHighestPatchRelease(minor, /*allowRcs=*/false, token)
	} else if ((match = versionString.match(/^dmd-2\.(\d+)b$/)) !== null) {
	    // 2.108b, same thing as above but allow pre-releases
	    minor = parseInt(match[1]);
	    [patch, rcSuffix]
		= await DMD.resolveHighestPatchRelease(minor, /*allowRcs=*/true, token)
	} else if ((match = versionString.match(/^dmd(?:-(beta|latest))?$/)) !== null) {
	    // dmd-beta, dmd-latest, dmd
	    let latestBeta = await DMD.resolveLatest("beta")
	    let latest = await DMD.resolveLatest("normal")
	    if (semver.cmpSemver(latestBeta, latest) < 0) {
		// If the beta is lower then latest, pick latest
		latestBeta = latest
	    }

	    if (match[1] == 'beta') {
		let rest
		[, minor, patch, rest] = latestBeta
		if (rest.length) {
		    rcSuffix=`-${rest[0]}.${rest[1]}`
		}
	    } else {
		[, minor, patch] = latest
	    }
	} else if ((match = versionString.match(/^dmd\^(\d+)?$/)) !== null) {
	    // dmd^4
	    let minorVersionsAgo = parseInt(match[1]);
	    [, minor] = await DMD.resolveLatest('normal')
	    if (minor < minorVersionsAgo)
		throw new Error(`Minor version to little. Requested ${match[1]} versions before latest but latest points to ${minor}`)
	    minor -= minorVersionsAgo;
	    [patch] =
		await DMD.resolveHighestPatchRelease(minor, /*allowRcs=*/false, token)
	} else {
	    throw new Error("Couldn't parse dmd version '" + versionString + "'")
	}

	return [minor, patch, rcSuffix]
    }

    /** Resolve the latest version of dmd

	@param betaOrNormal
	- if 'beta' resolve https://downloads.dlang.org/pre-releases/LATEST
	- if 'normal' resolve https://downloads.dlang.org/releases/LATEST
     */
    private static async resolveLatest(betaOrNormal: 'beta' | 'normal')
    : Promise<semver.SemVer> {
	let response = await utils.body_as_text(
	    betaOrNormal == 'beta' ?
		'https://downloads.dlang.org/pre-releases/LATEST'
		: 'https://downloads.dlang.org/releases/LATEST'
	)

	try {
	    return semver.parseSimpleSemver(response)
	} catch (error: unknown) {
	    throw new Error("Unrecognized format of downloads.dlang.org LATEST file: " + response + "\nNot a semver: " + (error as Error).message)
	}
    }

    /** Object to help cache the dmd repository tags as obtained from the github api */
    private static dmdTags = {
	/** An array of tag names */
	known: <string[]>[],
	/** the last (and single) page that was not fully parsed
	    during the previous query. Default to the first page.
	*/
	lastPage: 1,
	/** Check if the highest tag corresponding to a minor version
	    is not available.

	    this.known is a sorted list of tags in the dmd
	    repository. If its last element has a minor version lower
	    or equal to the one given as a parameter then there is no
	    need to query the github api for more tags. Otherwise a
	    query needs to be performed.

	    See the code in resolveHighestPatchRelease for how this
	    can be used.
	 */
	needUpdate(minor: number) {
	    const lastKnownVersion = semver.parseSimpleSemver(
		this.known[this.known.length - 1] ?? "2.9999.9999")
	    return minor < lastKnownVersion[1]
	},
    }

    /** Initialize a DMD class for the master nightly release on github */
    private static async initializeFromMaster(token: string): Promise<DMD> {
	let url = 'https://github.com/dlang/dmd/releases/download/nightly/dmd.master'
	return DMD.fromUrl(url, 'master', /*hasSigFile=*/false)
    }

    /**
       Common logic to create a DMD class once the url and the version are known.

       This function handles computing binPath, libPaths and the final
       url based on the host operating system.

       @param hasSigFile - if true the sig field is set to the final url + '.sig'
     */
    private static fromUrl(url: string,
		   version: string,
		   hasSigFile: boolean,
		   minor: number = 999): DMD {
	let name = 'dmd'
	let binPath: string
	let libPaths: string[]
	switch (process.platform) {
	    case "win32":
		url += '.windows'
		url += minor < 69 ? '.zip' : '.7z'
		// Since 2.091.0-beta.1 there are 64 bit binaries,
		// before that there were only 32 bit.
		const suffix = minor >= 91 ? '64' : ''
		binPath = `\\dmd2\\windows\\bin${suffix}`
		// Like https://dlang.org/install.sh we set PATH to
		// search first in \bin64 then in \bin. The order is reversed
		// since the values below are prepended to PATH, in order.
		libPaths = [ '\\dmd2\\windows\\bin', '\\dmd2\\windows\\bin64' ]
		break
	    case "linux":
		url += '.linux'
		url += minor < 69 ? '.zip' : '.tar.xz'
		binPath = '/dmd2/linux/bin64'
		libPaths = [ "/dmd2/linux/lib64" ]
		break
	    case "darwin":
		url += '.osx'
		url += minor < 69 ? '.zip' : '.tar.xz'
		binPath = '/dmd2/osx/bin'
		libPaths = [ "/dmd2/osx/lib" ]
		break
	    default:
		throw new Error("Unsupported dmd platform: " + process.platform)
	}
	let sig = hasSigFile ? url + '.sig' : undefined;
	const dmdWrapper = 'dmd'
	return new DMD(url, sig, name, version, binPath, libPaths, dmdWrapper)
    }

    /** Get the highest patch release for a minor release number.

	@param allowRcs - Whether to take into account pre-releases
	@param token - The github api token to make requests

	@returns A pair of the patch release and the pre-release suffix
	(if any).

	Example. If the dmd-2.108 release has the tags:
	- dmd-2.108.1-rc.1
	- dmd-2.108.0
	- dmd-2.108.0-beta.1

	Then:
	- resolveHighestPatchRelease(108, false, ...) == [0, '']
	- resolveHighestPatchRelease(108, true, ...) == [1, '-rc.1']
     */
    static async resolveHighestPatchRelease(minor: number,
					    allowRcs: boolean,
					    token: string): Promise<[number, string]> {
	let minorString = minor < 100 ? `0${minor}` : `${minor}`
	let regex: RegExp;
	if (allowRcs)
	    regex = new RegExp(`^v2\\.${minorString}\\.(\\d+)(-(?:beta|rc)\\.\\d+)?$`);
	else
	    regex = new RegExp(`^v2\\.${minorString}\\.(\\d+)$`);
	const lastVer: semver.SemVer = [2, minor - 1, 9999, []];

	if (DMD.dmdTags.needUpdate(minor)) {
	    DMD.dmdTags.lastPage += await utils.visitTags(
		`https://api.github.com/repos/dlang/dmd/tags?page=${DMD.dmdTags.lastPage}` ,
		token,
		function (tag) {
		    DMD.dmdTags.known.push(tag.name)

		    if (regex.test(tag.name)) {
			return false
		    }

		    // Finish early if we can't find a version. This
		    // shouldn't happen unless the user gave us a bad
		    // minor version
		    return semver.cmpSemver(lastVer, semver.parseSimpleSemver(tag.name)) < 0
		})
	}
	let result = DMD.dmdTags.known.find((s) => regex.test(s))
	if (result === undefined) {
	    throw new Error("Couldn't find any dmd patch releases for minor release " + minor)
	}

	let match = result.match(regex)
	if (match === null) {
	    throw new Error("Internal error, unmatched result!")
	}

	return [parseInt(match[1]), match[2] ?? '']
    }

}

/**
   A class that encapsulated data needed to download a ldc version
   */
export class LDC extends Compiler {
    /**
       Parse a user provided version string and convert it to a LDC class

       The versionString parameter can be in the following formats:

       - 'ldc' or 'ldc-latest' or 'ldc-beta'. This names resolve to
       the higheste available versions as specified on
       https://ldc-developers.github.io/LATEST or on
       https://ldc-developers.github.io/LATEST_BETA 'ldc' and
       'ldc-latest' use the former url, 'ldc-beta' uses the latter.

       - 'ldc-1.37.0'. This format resolves to
       https://github.com/ldc-developers/ldc/releases/download/v1.37.0/ldc2-1.37.0-<platform>

       - 'ldc-1.36.0-beta.1'. This format resolves to
       https://github.com/ldc-developers/ldc/releases/download/v1.36.0-beta1/ldc2-1.36.0-beta1-<platform>

       - 'ldc-1.36'. This format resolves to the highest patch release
       of version 1.36 (it would be 1.36.0). The result is computed
       using Github api so a token may be required.

       - 'ldc-1.36b'. This format resolves to the highest patch
       release (including release candidates) of minor version 1.36
       (it would be 1.36.0). The result is computed using Github api
       so a token may be required.

       - 'ldc^4'. This format resolves to 4 minor versions before
       latest. Example: If LATEST is v1.37.0 than this version
       resolves the same as 'ldc-1.33'.

       - 'ldc-master'. This resolves to the appropriate release at:
       https://github.com/ldc-developers/ldc/releases/tag/CI

       In the examples above the versions are arbitrary, pretty much
       anything should work.
     */
    static async initialize(versionString: string, token: string) {
	if (versionString == 'ldc-master')
	    return await LDC.initializeFromMaster(token)

	let version = await LDC.resolveVersion(versionString, token)
	let url = `https://github.com/ldc-developers/ldc/releases/download`
	url += `/v${version}`
	url += `/ldc2-${version}-${LDC.archiveSuffix(LDC.isLegacyOsx(version))}`

	return LDC.fromUrl(url, version, LDC.isLegacyOsx(version))
    }

    /** Check if a version needs the legacy osx archive naming

	The osx-universal.tar.xz archives are generated starting with ldc2-1.30.0-beta1
     */
    private static isLegacyOsx(version: string) {
        return semver.cmpSemver(semver.parseSimpleSemver(version), [1, 30, 0, ["beta1"]]) < 0
    }

    /**
       Common logic to create a LDC class once the url and the version are known.

       This function handles computing binPath and libPaths based on the host os
     */
    private static fromUrl(url: string, version: string, legacyOsx: boolean = false): LDC {
	let suffix = LDC.archiveSuffix(legacyOsx)
	suffix = suffix.slice(0, suffix.indexOf('.'))
	let name = 'ldc2'
	const basePath = (process.platform == "win32") ?
            `\\ldc2-${version}-${suffix}\\` :
            `/ldc2-${version}-${suffix}/`;
	let binPath: string = `${basePath}bin`
	let libPaths: string[]
	switch (process.platform) {
            case "win32":  libPaths = [`${basePath}lib64`]; break;
            case "linux":  libPaths = [`${basePath}lib`]; break;
            case "darwin": libPaths = legacyOsx ?
		    [`${basePath}lib`] :
		    [`${basePath}lib-arm64`, `${basePath}lib-x86_64`]; break;
            default:
		throw new Error("unsupported platform: " + process.platform);
	}
	const dmdWrapper = 'ldmd2'

	return new LDC(url, undefined, name, version, binPath, libPaths, dmdWrapper)
    }

    /** Get the suffix of a release archive taking into account the host os */
    private static archiveSuffix(legacyOsx = false): string {
	let arch: string = ''
	switch (process.platform) {
	    case "win32": return 'windows-multilib.7z'
	    case "linux":
		switch (process.arch) {
		    // supported on very old LDC releases
		    case "ia32": arch = "x86"; break;
		    case "x64": arch = "x86_64"; break;
		    case "arm": arch = "armhf"; break; // supported on old LDC releases
		    case "arm64": arch = "aarch64"; break;
		    default: throw new Error(`Unknown architecture ${process.arch} for ldc on linux`)
		}
		return `linux-${arch}.tar.xz`
	    case "darwin":
		switch (process.arch) {
		    // supported on very old LDC releases
		    case "ia32":
		    case "x64": arch = "x86_64"; break;
		    case "arm":
		    case "arm64": arch = "arm64"; break;
		    default: throw new Error(`Unknown architecture ${process.arch} for ldc on osx`)
		}
		arch = legacyOsx ? arch : 'universal'
		return `osx-${arch}.tar.xz`
	    default:
		throw new Error("unsupported platform: " + process.platform);
	}
    }

    /** Initialize a LDC class from the master branch of the repository */
    private static async initializeFromMaster(token: string): Promise<LDC> {
	let suffix = LDC.archiveSuffix()
	let json = await utils.body_as_text(
	    `https://api.github.com/repos/ldc-developers/ldc/releases/tags/CI`,
	    token
	);
	let assets = JSON.parse(json)["assets"];
	if (assets == undefined) {
	    console.log(json)
	    throw new Error("Couldn't load assets json for ldc master");
	}
	if (assets.length == 0)
	    throw new Error("No assets found for LDC CI release");

	const goodRelease = new RegExp(`^ldc2-([0-9a-fA-F]{5,12})-${suffix}$`)
	assets = assets
	    .filter((asset) => goodRelease.test(asset.name))
	    .map(function(asset){
		const name = asset["name"]
		const matches = name.match(goodRelease)
		if (matches === null)
		    throw new Error(`Internal error, non-matching ldc tag: ${name}`)

		return {
		    name,
		    commit: matches[1],
		    updated_at: asset["updated_at"],
		}
	    })

	if (assets.length == 0)
	    throw new Error(`No assets found for LDC CI release for platform ${suffix}`);

	assets.sort((a, b) => Date.parse(a["updated_at"]) > Date.parse(b["updated_at"]) ? -1 : 1)
	let { name, commit } = assets[0]
	let url = `https://github.com/ldc-developers/ldc/releases/download/CI/${name}`

	return LDC.fromUrl(url, commit)
    }

    /** Resolve a user provided string into a LDC version

	Check LDC.initialize for possible formats of versionString

	@returns A string representing the version. Possible values are:
	- 1.36.0
	- 1.30.0-beta1
	- etc.
    */
    static async resolveVersion(versionString: string, token: string): Promise<string> {
	if (!versionString.startsWith('ldc'))
	    throw new Error(`ldc version string doesn't start with ldc: ${versionString}`)
	let version: string
	let match
	if ((match = versionString.match(/ldc(-(beta|latest))?$/)) !== null) {
	    // ldc ldc-beta ldc-latest
	    version = await utils.body_as_text(
		"https://ldc-developers.github.io/LATEST"
		    + (match[2] == 'beta' ? '_BETA' : ''));
	} else if ((match = versionString.match(/^ldc-(\d+\.\d+\.\d+(?:.*))$/)) !== null) {
	    // ldc-1.37.0 ldc-1.36.0-beta1
	    version = match[1]
	} else if ((match = versionString.match(/^ldc-(\d+).(\d+)(b)?$/)) !== null) {
	    // ldc-1.37 ldc-1.37b
	    version = await LDC.resolveHighestPatchRelease(+match[1], +match[2],
							   match[3] == 'b', token)
	} else if ((match = versionString.match(/^ldc\^(\d+)$/)) !== null) {
	    // ldc^4
	    let latest = await utils.body_as_text('https://ldc-developers.github.io/LATEST')
	    let [major, minor] = semver.parseSimpleSemver(latest)
	    if (minor < match[1])
		throw new Error(`Minor version to little. Requested ${match[1]} versions before latest but latest points to ${major}.${minor}`)
	    minor -= match[1]
	    version = await LDC.resolveHighestPatchRelease(major, minor,
							   /*allowRcs=*/false, token)
	} else
	    throw new Error(`Unrecognized ldc version string: ${versionString}`)

	return version
    }

    /** Get the highest patch release for a major.minor version

	@param allowRcs - whether to take pre-releases into consideration
	@param token - Github api token used to get the tags of the ldc repository
    */
    private static async resolveHighestPatchRelease(major: number, minor: number,
						    allowRcs: boolean, token: string)
    : Promise<string> {
	let versionReg = `^v${major}\\.${minor}\\.(\\d+)`
	if (allowRcs) versionReg += '(.*)' // we are lenient with the suffixes
	versionReg += '$'
	let regex = new RegExp(versionReg)

	let result: string | undefined
	await utils.visitTags(
	    `https://api.github.com/repos/ldc-developers/ldc/tags`,
	    token,
	    function(tag) {
		if (regex.test(tag.name)) {
		    result = tag.name
		    return false
		}

		if (!tag.name.startsWith('v')) {
		    // Ignore tags lik dmd-rewrite-v2.072.0-b2
		    return true
		}

		let ver = semver.parseSimpleSemver(tag.name)
		if (ver[0] == major)
		    return ver[1] >= minor
		return true
	    })
	if (result === undefined)
	    throw new Error(`No tag matching ${major}.${minor} found for ldc`)
	return result.slice(1)
    }
}

export class Dub implements ITool {
    public readonly name = 'dub'
    public readonly exeName = this.name + exeExt
    constructor(public url: string, public version: string) {}

    /** Parse a version string and compute the associated version

	Possible values for version are:

	- 'latest'. The release is taken from:
	https://api.github.com/repos/dlang/dub/releases/latest

	- '1.37.0'. This corresponds to the tag 'v1.37.0'. Note that
          pre-releases like 'v1.37.0-rc.1' are not supported.
    */
    static async initialize(version: string, token: string) {
	if (version === "latest") {
	    let json = await utils.body_as_text(
		`https://api.github.com/repos/dlang/dub/releases/latest`,
		token
	    );
	    let rname = JSON.parse(json)["tag_name"];
	    if (rname == undefined) {
		console.log(json)
		throw new Error("Couldn't load release name for dub latest version");
	    }
	    version = rname;
	}

	const matches = version.match(/^v?(1\.\d+\.\d+)(-.+)?$/);
	if (!matches)
	    throw new Error("unrecognized DUB version: '" + version +
		"'. Make sure to use the dub version, and not the frontend one.");
	if (matches[2])
	    throw new Error("only release versions of DUB are supported, not: " + version)
	version = "v" + matches[1];

	const archSuffix = Dub.getUrlArchSuffix(version)
	let url: string
	switch (process.platform) {
            case "win32":
		url = `https://github.com/dlang/dub/releases/download/${version}/dub-${version}-windows-${archSuffix}.zip`
		break
            case "linux":
		url = `https://github.com/dlang/dub/releases/download/${version}/dub-${version}-linux-${archSuffix}.tar.gz`
		break
            case "darwin":
		url = `https://github.com/dlang/dub/releases/download/${version}/dub-${version}-osx-${archSuffix}.tar.gz`
		break
        default:
		throw new Error("unsupported platform: " + process.platform);
	}

	return new Dub(url, version)
    }

    static getUrlArchSuffix (version: string) {
	if (process.arch == 'x64')
	    return 'x86_64'

	if (process.arch == 'arm64' && process.platform == 'darwin') {
	    const sv = semver.parseSimpleSemver(version)
	    const hasArm64Binaries: semver.SemVer = [1, 38, 1, []]
	    if (semver.cmpSemver(sv, hasArm64Binaries) >= 0)
		return 'arm64'
	    return 'x86_64'
	}

	throw new Error(`Unsupported platform-arch triple (${process.platform}-${process.arch}) for dub releases ${version}`)
    }

    /** Return the path to where the url archive was extracted, after caching it */
    private async getCached(): Promise<string> {
	let cached = await tc.find(this.name, this.version)
	if (!cached) {
	    const archive = await utils.downloadTool(this.url)
	    let extracted = await utils.extract(this.url, archive)
	    cached = await tc.cacheFile(extracted + sep + this.exeName,
					this.exeName, this.name, this.version)
	}
	return cached
    }

    async makeAvailable() {
	let dubDir = await this.getCached()
	console.log(`Adding dub directory '${dubDir}' to path`)
	core.addPath(dubDir)
    }
}


export class Redub implements ITool {
    public readonly name = 'redub'
    public readonly exeName = this.name + exeExt;
    constructor(public url: string, public version: string){}

	static getUrlArchSuffix (version: string) {
		switch(process.arch)
		{
			case "x64": return "x86_64";
			case "arm64": return "arm64";
			default: throw new Error(`Unsupported arch ${process.arch} for redub releases ${version}`);
		}
    }

	static getOS () {
		switch (process.platform) {
			case "win32": return "windows";
			case "linux": return "linux";
			case "darwin": return "osx";
			default: throw new Error("unsupported platform: " + process.platform);
		}
	}


    /** Parse a version string and compute the associated version

	Possible values for version are:

	- 'latest'. The release is taken from:
	https://api.github.com/repos/MrcSnm/redub/releases/latest

	- 'nightly'. The release is taken from https://github.com/MrcSnm/redub/releases/nightly

	- '1.37.0'. This corresponds to the tag 'v1.37.0'. Note that
          pre-releases like 'v1.37.0-rc.1' are not supported.
    */
    static async initialize(version: string, token: string) {
		const archSuffix = Redub.getUrlArchSuffix(version)

		if (version == "nightly") {
			return new Redub(`https://github.com/MrcSnm/redub/releases/download/nightly/redub-latest-${Redub.getOS()}-${archSuffix}${exeExt}`, version);
		}
		if (version === "latest") {
			let json = await utils.body_as_text(
				`https://api.github.com/repos/MrcSnm/redub/releases/latest`,
				token
			);
			let rname = JSON.parse(json)["tag_name"];
			if (rname == undefined) {
				console.log(json)
				throw new Error("Couldn't load release name for redub latest version");
			}
			version = rname;
		}

		const matches = version.match(/^v?(1\.\d+\.\d+)(-.+)?$/);
		if (!matches)
			throw new Error("unrecognized Redub version: '" + version + '"')
		if (matches[2])
			throw new Error("only release versions of Redub are supported, not: " + version)
		version = "v" + matches[1];

		const url = `https://github.com/MrcSnm/redub/releases/download/${version}/redub-${version}-${Redub.getOS()}-${archSuffix}${exeExt}`
		return new Redub(url, version)
    }

    /** Return the path to where the url archive was extracted, after caching it */
    private async getCached(): Promise<string> {
	let cached = await tc.find(this.name, this.version)
	if (!cached) {
		console.log(`Downloading ${this.url}`);
	    const archive = await utils.downloadTool(this.url);
	    cached = await tc.cacheFile(archive,
					this.exeName, this.name, this.version)
		const exePath = cached + sep + this.exeName;
		fs.chmodSync(exePath, 0o755);
	}
	return cached
    }

    async makeAvailable() {
	let redubDir = await this.getCached()
	console.log(`Adding redub directory '${redubDir}' to path`)
	core.addPath(redubDir)
    }
}

export class GDC implements ITool {
    /** The version of the gdc apt package that will install gdc, it can by empty

	Example:
	''    -> sudo apt install gdc
	'-12' -> sudo apt install gdc-12
     */
    private aptPkgVersion: string
    /** A commit sha in https://github.com/D-Programming-GDC/gdmd.

	Example: dc0ad9f739795f3ce5c69825efcd5d1d586bb013
    */
    private gdmdSha: string

    constructor(aptPkgVersion: string, gdmdSha: string) {
	this.aptPkgVersion = aptPkgVersion
	this.gdmdSha = gdmdSha
    }

    /** Parse a user provided version string and convert it to a gdc class

	Common values for versionString are: gdc, gdc-12 or
	gdc-11.
	gdmdSha is a full commit sha in https://github.com/D-Programming-GDC/gdmd.

	Note that the implementation only supports linux (and only
	through apt).
     */
    static async initialize(versionString: string, gdmdSha: string): Promise<GDC> {
	if (process.platform != 'linux')
	    throw new Error(`Gdc is currently only supported on linux, not ${process.platform}`)
	if (!gdmdSha)
	    throw new Error('Need a commit sha to dowloand gdmd')

	let match = versionString.match(/^gdc(-\d+)?$/)
	if (match === null)
	    throw new Error(`Unrecognized gdc format '${versionString}'`)
	const aptPkgVersion = match[1] ?? ''
	const realSha = gdmdSha == 'latest' ? 'master' : gdmdSha

	return new GDC(aptPkgVersion, realSha)
    }

    async makeAvailable() {
	await this.makeAvailableGdc()
	await this.makeAvailableGdmd()
    }

    /** Install gdc from the apt repos and set DC to point to it */
    async makeAvailableGdc () {
	const binName = `gdc${this.aptPkgVersion}`
	console.log(`Installing ${binName}`)
	await exec.exec('sudo apt-get update')
	await exec.exec('sudo', ['apt-get', 'install', '-y', binName])
	console.log(`Setting DC to '/usr/bin/${binName}'`)
	core.exportVariable('DC', `/usr/bin/${binName}`)
    }

    /** Install gdmd from https://github.com/D-Programming-GDC/gdmd and set DMD to point to it */
    async makeAvailableGdmd () {
	const sha = this.gdmdSha
	// gdmd should match the executable name of gdc.
	// If /usr/bin/gdc-11 then the script should be in /usr/bin/gdmd-11
	// If /usr/bin/gdc then the script should be in /usr/bin/gdmd
	const binName = `/usr/bin/gdmd${this.aptPkgVersion}`

	let cached = tc.find('gdmd', sha)
	if (!cached) {
	    const url = `https://raw.githubusercontent.com/D-Programming-GDC/gdmd/${sha}/dmd-script`
	    const path = await tc.downloadTool(url)
	    cached = await tc.cacheFile(path, 'gdmd', 'gdmd', sha)
	}

	console.log(`Copying gdmd script to ${binName}`)
	await exec.exec('sudo', ['cp', cached + '/gdmd', binName])
	await exec.exec('sudo', ['chmod', '+x', binName])

	console.log(`Setting DMD to '${binName}'`)
	core.exportVariable('DMD', binName)
    }
}
