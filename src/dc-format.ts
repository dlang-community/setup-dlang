import * as path from 'path'
import SETTINGS from  '../src/settings'

export type DcFormat = 'absolute' | 'basename' | 'shortname'

export function formatDc(dcAbsPath: string, format: DcFormat) {
    switch (format) {
        case 'absolute':
            return dcAbsPath;
        case 'basename':
            return path.basename(dcAbsPath)
        case 'shortname':
            return path.basename(dcAbsPath, SETTINGS.exeExt)
        default:
            throw new Error('Unknown dc_format: ' + format)
    }
}
