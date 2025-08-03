import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as gpg from './gpg';

import * as d from './d'
import { existsSync } from 'fs';
import { extract } from './utils'

export function getActionInputs() {
    let default_compiler = "dmd-latest";
    if (process.arch != "x64") {
        default_compiler = "ldc-latest";
    }
    const d_compiler = core.getInput('compiler') || default_compiler;
    const gh_token = core.getInput('gh_token') || "";
    let dub_version = core.getInput('dub')
    if (dub_version == 'any') {
        if (d_compiler.startsWith('gdc'))
            dub_version = 'latest'
        else
            dub_version = ''
    }

    const gdmd_sha = core.getInput('gdmd_sha') || ""

    return { d_compiler, gh_token, dub_version, gdmd_sha };
}

export async function run() {
    try {
	let { d_compiler, gh_token, dub_version, gdmd_sha } = getActionInputs();

	let compiler: d.ITool
	if (d_compiler.startsWith('dmd'))
	    compiler = await d.DMD.initialize(d_compiler, gh_token)
	else if (d_compiler.startsWith('ldc'))
	    compiler = await d.LDC.initialize(d_compiler, gh_token)
	else if (d_compiler.startsWith('gdc'))
	    compiler = await d.GDC.initialize(d_compiler, gdmd_sha)
	else
	    throw new Error(`Unrecognized compiler: '${d_compiler}'`)

	let dub: d.Dub | undefined
        if (dub_version.length) {
	    dub = await d.Dub.initialize(dub_version, gh_token)
            console.log(`Enabling ${d_compiler} with dub ${dub_version}`);
        } else
            console.log(`Enabling ${d_compiler}`);

	await compiler.makeAvailable()
	await dub?.makeAvailable()

        console.log("Done");
    } catch (error) {
	if (error instanceof Error) {
	    console.log(error.message);
	    core.setFailed(error.message);
	}
    }
}
