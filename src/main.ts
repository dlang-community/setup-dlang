import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import { mkdirP } from '@actions/io';
import * as path from 'path';

import { compiler } from './compiler';

async function run() {
    try {
        if (process.arch != "x64")
            throw new Error("Only x64 arch is supported by all platforms");    

        const input = core.getInput('compiler');
        const descr = compiler(input);

        console.log(`Enabling ${input}`);

	let cached = tc.find('dc', input);

	if (cached) {
		console.log("Using cache");                                
	}
	else {
		console.log(`Downloading ${descr.url}`);
		const archive = await tc.downloadTool(descr.url);
		core.debug("downloaded");
		const dc_path = await extract(archive);
		core.debug("extracted");
		cached = await tc.cacheDir(dc_path, 'dc', input);
	}

	core.addPath(cached + descr.binpath);
	core.exportVariable("DC", descr.name);
        console.log("Done");
    } catch (error) {
        core.setFailed(error.message);
    }
}

async function extract(archive: string) {
    switch (process.platform) {
        case "win32":
            return await tc.extract7z(archive);
        case "linux":
        case "darwin":
            return await tc.extractTar(archive, undefined, 'x');
        default:
            throw new Error("unsupported platform: " + process.platform);
    }
}

run();
