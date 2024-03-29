import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import { rmRF } from '@actions/io';
import * as gpg from './gpg';

import { compiler } from './compiler';
import { existsSync } from 'fs';

async function run() {
    try {
        let default_compiler = "dmd-latest";
        if (process.arch != "x64") {
            default_compiler = "ldc-latest";
        }
        const input = core.getInput('compiler') || default_compiler;
        if (process.arch != "x64" && input.startsWith("dmd"))
            throw new Error("The dmd compiler is not supported for non-x64 architecture");

        const gh_token = core.getInput('gh_token') || "";
        const dub_version = core.getInput('dub') || "";
        const descr = await compiler(input, dub_version, gh_token);

        if (dub_version.length)
            console.log(`Enabling ${input} with dub ${dub_version}`);
        else
            console.log(`Enabling ${input}`);

        const cache_tag = descr.name + "-" + descr.version + (descr.dub ? "+dub-" + descr.dub.version : "");

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

            if (descr.dub) {
                console.log(`Downloading ${descr.dub.url}`);
                const archive2 = await tc.downloadTool(descr.dub.url);
                // Required on Windows, other archive tools don't mind the override
                if (process.platform === "win32") {
                    console.log("Removing: " + dc_path + descr.binpath + "\\dub.exe");
                    await rmRF(dc_path + descr.binpath + "\\dub.exe");
                    await descr.libpath.forEach(function(libpath) {
                        const path = dc_path + libpath;
                        console.log("Removing: " + path + "\\dub.exe");
                        return rmRF(path + "\\dub.exe");
                    });
                }
                await extract(descr.dub.url, archive2, dc_path + descr.binpath);
            }

            cached = await tc.cacheDir(dc_path, 'dc', cache_tag);
        }

        const binpath = cached + descr.binpath;
        console.log("Adding '" + binpath + "' to path");
        core.addPath(binpath);
        core.exportVariable("DC", descr.name);

        let LD_LIBRARY_PATH = process.env["LD_LIBRARY_PATH"] || "";
        descr.libpath.forEach(function(libpath) {
            const path = cached + libpath;
            console.log("Adding '" + path + "' to library path");
            if (existsSync(path)) {
                if (process.platform == "win32") {
                    core.addPath(path);
                }
                else {
                    if (LD_LIBRARY_PATH.length > 0)
                        LD_LIBRARY_PATH += ":";
                    LD_LIBRARY_PATH += path;
                    core.exportVariable("LD_LIBRARY_PATH", LD_LIBRARY_PATH);
                }
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
