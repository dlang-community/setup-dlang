import * as core from '@actions/core'
import { type DcFormat } from './dc-format'

const SETTINGS = {
    verifySig: core.getInput('verify_sig') !== 'false',
    dcFormat: (core.getInput('dc_format') as DcFormat) || 'absolute',

    sep: process.platform == 'win32' ? '\\' : '/',
    exeExt: process.platform == 'win32' ? '.exe' : '',
}

export default SETTINGS
