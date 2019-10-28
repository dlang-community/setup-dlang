import * as tc from '@actions/tool-cache';
import { promisify } from 'util';
import { exec } from 'child_process';

const aexec = promisify(exec);

export async function verify(path: string) {
    const keyring = await tc.downloadTool("https://dlang.org/d-keyring.gpg");
    const result = await aexec(
        `gpg --verify --keyring ${keyring} --no-default-keyring ${path}`);
    console.log(result.stdout);
}
