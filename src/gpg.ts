import * as tc from '@actions/tool-cache';
import * as exec from '@actions/exec'
import * as core from '@actions/core'

export async function verify(file_path: string, sig_url: string) {
    let keyring = await tc.downloadTool("https://dlang.org/d-keyring.gpg");
    let sig_path = await tc.downloadTool(sig_url);
    // hack to workaround gpg on windows interaction with paths
    keyring = win_path_to_msys(keyring);

    await exec.exec(
        'gpg',
        [ '--lock-never', '--verify', '--keyring', keyring, '--no-default-keyring',
          sig_path, file_path ]
    )
}

// hack to workaround gpg on windows interaction with paths
function win_path_to_msys(path: string) {
    if (process.platform != "win32")
        return path

    path = core.toPosixPath(path)
    const drive = path[0]
    path = '/' + drive + path.slice(2)
    return path
}
