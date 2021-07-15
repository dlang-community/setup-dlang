import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import { mkdirP } from '@actions/io';
import * as gpg from './gpg';

import { compiler, legacyDub } from './compiler';

async function run() {
    try {
        if (process.arch != "x64")
            throw new Error("Only x64 arch is supported by all platforms");

        const input = core.getInput('compiler') || "dmd-latest";
        const gh_token = core.getInput('gh_token') || "";
        const descr = await compiler(input, gh_token);

        console.log(`Enabling ${input}`);

        const cache_tag = descr.name + "-" + descr.version + (descr.download_dub ? "+dub" : "");

        let cached = tc.find('dc', cache_tag);

        if (cached) {
            console.log("Using cache");
        }
        else {
            console.log(`Downloading ${descr.url}`);
            const archive = await tc.downloadTool(descr.url);
            if (descr.sig)
            {
                console.log("Verifying the download with GPG");
                await gpg.install();
                await gpg.verify(archive, descr.sig);
            }
            const dc_path = await extract(descr.url, archive);

            if (descr.download_dub) {
                const dub = await legacyDub();
                const archive2 = await tc.downloadTool(dub.url);
                await extract(dub.url, archive2, dc_path + descr.binpath);
            }

            cached = await tc.cacheDir(dc_path, 'dc', cache_tag);
        }

        const binpath = cached + descr.binpath;
        console.log("Adding '" + binpath + "' to path");
        core.addPath(binpath);
        core.exportVariable("DC", descr.name);

        descr.libpath.forEach(function(libpath) {
            const path = cached + libpath;
            console.log("Adding '" + path + "' to library path");
            if (process.platform == "win32") {
                core.addPath(path);
            }
            else {
                core.exportVariable("LD_LIBRARY_PATH", path);
            }
        });
        console.log("Done");
    } catch (error) {
        console.log(error);
        core.setFailed(error.message);
    }
}

async function extract(format: string, archive: string, into?: string) {
    if (format.endsWith(".7z"))
        return await tc.extract7z(archive, into);
    else if (format.endsWith(".zip"))
        return await tc.extractZip(archive, into);
    else if (/\.tar(\.\w+)?$/.test(format))
        return await tc.extractTar(archive, into, 'x');

    throw new Error("unsupported archive format: " + format);
}

run();
