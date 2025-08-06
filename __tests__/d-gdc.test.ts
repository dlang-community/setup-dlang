import { GDC } from '../src/d'
import * as testUtils from './test-helpers.test'
import * as exec from '@actions/exec'
import * as tc from '@actions/tool-cache'
import SETTINGS from '../src/settings'

const GdmdSha = 'dc0ad9f739795f3ce5c69825efcd5d1d586bb013'

testUtils.saveProcessRestorePoint()
testUtils.hideConsoleLogs()
const origEnv = process.env
beforeEach(() => {
    process.env = origEnv
    jest.spyOn(exec, 'exec').mockResolvedValue(0)
    Object.defineProperty(process, 'platform', { value: 'linux' })
})

async function init (version: string) {
    const gdc = await GDC.initialize(version, GdmdSha)
    await gdc.makeAvailableGdc()
}

test('Test simple versions', async () => {
    await init('gdc')
    expect(process.env['DC']).toBe('/usr/bin/gdc')
    await init('gdc-13')
    expect(process.env['DC']).toBe('/usr/bin/gdc-13')
    await init('gdc-9')
    expect(process.env['DC']).toBe('/usr/bin/gdc-9')
})

test('Test error messages', async () => {
    await expect(init('dmd-2.109.0')).rejects.toThrow('dmd-2.109.0')
})

test('Test that gdc fails on non-Linux', async () => {
    for (const platform of [ 'win32', 'darwin', 'freebsd' ]) {
	Object.defineProperty(process, 'platform', { value: platform })
	await expect(init('gdc')).rejects.toThrow(platform)
    }
})

test('Test gdc invalid versions', async () => {
    for (const bad of [ 'gdmd', 'gdc-11.3.0', '11', 'absolute garbage' ])
	await expect(init(bad)).rejects.toThrow(bad)
})

test('Test that gdc respects gdmd commit sha', async () => {
    jest.spyOn(tc, 'find').mockReturnValue('')
    const spy = jest.spyOn(tc, 'downloadTool').mockResolvedValue('')
    jest.spyOn(tc, 'cacheFile').mockResolvedValue('/my/path')

    const sha = '1a4bcb202d37f0040477444c16bfa69a88e8bec7'
    const gdc = await GDC.initialize('gdc', sha)
    await gdc.makeAvailableGdmd()

    expect(spy.mock.calls[0][0]).toMatch(sha)
})

test('Test that gdmd_sha latest resolves to upstream master branch', async () => {
    jest.spyOn(tc, 'find').mockReturnValue('')
    const spy = jest.spyOn(tc, 'downloadTool').mockResolvedValue('')
    jest.spyOn(tc, 'cacheFile').mockResolvedValue('/my/path')

    const gdc = await GDC.initialize('gdc', 'latest')
    await gdc.makeAvailableGdmd()

    expect(spy.mock.calls[0][0]).toBe(
	'https://raw.githubusercontent.com/D-Programming-GDC/gdmd/master/dmd-script')
})

describe('Gdmd tests', () => {
    const cached = '/tmp/cache/gdmd'
    beforeEach(() => {
	jest.spyOn(tc, 'find').mockReturnValue(cached)
    })

    test('Test that gdc sets both DC and DMD properly', async () => {
	const sha = 'dc0ad9f739795f3ce5c69825efcd5d1d586bb013'
	const gdc = await GDC.initialize('gdc', sha)
	await gdc.makeAvailable()
	expect(process.env['DC']).toBe('/usr/bin/gdc')
	expect(process.env['DMD']).toBe('/usr/bin/gdmd')

	const gdc_12 = await GDC.initialize('gdc-12', sha)
	await gdc_12.makeAvailable()
	expect(process.env['DC']).toBe('/usr/bin/gdc-12')
	expect(process.env['DMD']).toBe('/usr/bin/gdmd-12')
    })

    test('Test that gdc gracefully handles invalid gdmd commit shas', async () => {
	await expect(GDC.initialize('gdc', '')).rejects.toThrow('gdmd')
    })
})

describe('test DC and DMD format', () => {
    const origDcFormat = SETTINGS.dcFormat
    afterEach(() => SETTINGS.dcFormat = origDcFormat)

    test('shortname', async () => {
        SETTINGS.dcFormat = 'shortname'
        const gdc = await GDC.initialize('gdc-14', GdmdSha)
        await gdc.makeAvailable()
        expect(process.env['DC']).toBe('gdc-14')
        expect(process.env['DMD']).toBe('gdmd-14')
    })
})
