import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import { mkdirP } from '@actions/io';

import { compiler } from './compiler';

async function run() {
    try {
        if (process.arch != "x64")
            throw new Error("Only x64 arch is supported by all platforms");    

        const input = core.getInput('compiler');
        const descr = compiler(input);
        
        console.log(`Enabling ${input}`);

        {
            const cached = tc.find('dc', input);

            if (cached) {
                console.log("Using cache");
                core.addPath(cached + descr.binpath);
                return;
            }
        }        
        
        console.log(`Downloading ${descr.url}`);

        const archive = await tc.downloadTool(descr.url);        

        const home = process.env['HOME'];        
        const dest = `${home}/dc/${input}`;
        await mkdirP(dest);
        const dc_path = await extract(archive, dest);
        const cached = await tc.cacheDir(dc_path, 'dc', input);

        core.addPath(cached + descr.binpath);
        console.log("Done, PATH updated");
    } catch (error) {
        core.setFailed(error.message);
    }
}

async function extract(archive: string, dest: string) {
    switch (process.platform) {
        case "win32":
            return await tc.extract7z(archive, dest);
        case "linux":
        case "darwin":
            return await tc.extractTar(archive, dest, 'x');
        default:
            throw new Error("unsupported platform: " + process.platform);
    }
}

run();