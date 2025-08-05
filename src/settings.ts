import * as core from '@actions/core'

const SETTINGS = {
    verifySig: core.getInput('verify_sig') !== 'false',

    sep: process.platform == 'win32' ? '\\' : '/',
    exeExt: process.platform == 'win32' ? '.exe' : '',
}

export default SETTINGS
