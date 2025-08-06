import { DMD } from '../src/d'
import * as gpg from '../src/gpg'
import * as utils from '../src/utils'
import * as testUtils from './test-helpers.test'
import * as tc from '@actions/tool-cache'
import fs from 'fs'

import SETTINGS from '../src/settings'

testUtils.hideConsoleLogs()
testUtils.saveProcessRestorePoint()
testUtils.disableNetwork()
function init(version: string) { return DMD.initialize(version, '') }

describe('amd64', () => {
    beforeEach(() => Object.defineProperty(process, 'arch', { value: 'x64' }))
    async function doTest(input: string, url: string, sig: string | undefined,
			  version: string, binPath: string, libPaths: string | string[]) {
	const dmd = await init(input)
	expect(dmd.url).toBe(url)
	expect(dmd.sig).toBe(sig)
	expect(dmd.name).toBe('dmd')
	expect(dmd.version).toBe(version)
	expect(dmd.binPath).toBe(binPath)
	const libs = typeof libPaths === 'string' ? [ libPaths ] : libPaths
	for (const lib of libs)
	    expect(dmd.libPaths).toContain(lib)
    }

    describe('Test exact version', () => {
	let url: string

	test('A recent version', async () => {
	    const version = 'dmd-2.109.1'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.109.1/dmd.2.109.1.linux.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.109.1', '/dmd2/linux/bin64', '/dmd2/linux/lib64')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.109.1/dmd.2.109.1.windows.7z'
	    await doTest(version, url, url + '.sig',
			 '2.109.1', '\\dmd2\\windows\\bin64', [ '\\dmd2\\windows\\bin',
							        '\\dmd2\\windows\\bin64' ])

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.109.1/dmd.2.109.1.osx.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.109.1', '/dmd2/osx/bin', '/dmd2/osx/lib')
	})

	test('A minor version that starts with 0', async () => {
	    const version = 'dmd-2.097.2'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.097.2/dmd.2.097.2.linux.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.097.2', '/dmd2/linux/bin64', '/dmd2/linux/lib64')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.097.2/dmd.2.097.2.windows.7z'
	    await doTest(version, url, url + '.sig',
			 '2.097.2', '\\dmd2\\windows\\bin64', [ '\\dmd2\\windows\\bin',
								'\\dmd2\\windows\\bin64' ])

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.097.2/dmd.2.097.2.osx.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.097.2', '/dmd2/osx/bin', '/dmd2/osx/lib')
	})

	test('An older version', async () => {
	    const version = 'dmd-2.078.1'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.078.1/dmd.2.078.1.linux.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.078.1', '/dmd2/linux/bin64', '/dmd2/linux/lib64')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.078.1/dmd.2.078.1.windows.7z'
	    await doTest(version, url, url + '.sig',
			 '2.078.1', '\\dmd2\\windows\\bin', [ '\\dmd2\\windows\\bin',
							      '\\dmd2\\windows\\bin64' ])

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.078.1/dmd.2.078.1.osx.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.078.1', '/dmd2/osx/bin', '/dmd2/osx/lib')
	})

	test('Oldest allowed version', async () => {
	    const version = 'dmd-2.065.0'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.065.0/dmd.2.065.0.linux.zip'
	    await doTest(version, url, url + '.sig',
			 '2.065.0', '/dmd2/linux/bin64', '/dmd2/linux/lib64')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.065.0/dmd.2.065.0.windows.zip'
	    await doTest(version, url, url + '.sig',
			 '2.065.0', '\\dmd2\\windows\\bin', [ '\\dmd2\\windows\\bin',
							      '\\dmd2\\windows\\bin64' ])

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.065.0/dmd.2.065.0.osx.zip'
	    await doTest(version, url, url + '.sig',
			 '2.065.0', '/dmd2/osx/bin', '/dmd2/osx/lib')
	})
    })

    describe('Test exact pre-release version', () => {
	let url: string

	test('A recent version', async () => {
	    const version = 'dmd-2.110.0-beta.1'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.110.0/dmd.2.110.0-beta.1.linux.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.110.0-beta.1', '/dmd2/linux/bin64', '/dmd2/linux/lib64')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.110.0/dmd.2.110.0-beta.1.windows.7z'
	    await doTest(version, url, url + '.sig',
			 '2.110.0-beta.1', '\\dmd2\\windows\\bin64', [ '\\dmd2\\windows\\bin',
							               '\\dmd2\\windows\\bin64' ])

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.110.0/dmd.2.110.0-beta.1.osx.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.110.0-beta.1', '/dmd2/osx/bin', '/dmd2/osx/lib')
	})

	test('A minor version that starts with 0', async () => {
	    const version = 'dmd-2.097.0-rc.1'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.097.0/dmd.2.097.0-rc.1.linux.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.097.0-rc.1', '/dmd2/linux/bin64', '/dmd2/linux/lib64')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.097.0/dmd.2.097.0-rc.1.windows.7z'
	    await doTest(version, url, url + '.sig',
			 '2.097.0-rc.1', '\\dmd2\\windows\\bin64', [ '\\dmd2\\windows\\bin',
								     '\\dmd2\\windows\\bin64' ])

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.097.0/dmd.2.097.0-rc.1.osx.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.097.0-rc.1', '/dmd2/osx/bin', '/dmd2/osx/lib')
	})

	test('An older version', async () => {
	    const version = 'dmd-2.086.0-rc.2'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.086.0/dmd.2.086.0-rc.2.linux.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.086.0-rc.2', '/dmd2/linux/bin64', '/dmd2/linux/lib64')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.086.0/dmd.2.086.0-rc.2.windows.7z'
	    await doTest(version, url, url + '.sig',
			 '2.086.0-rc.2', '\\dmd2\\windows\\bin', [ '\\dmd2\\windows\\bin',
								   '\\dmd2\\windows\\bin64' ])

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.086.0/dmd.2.086.0-rc.2.osx.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.086.0-rc.2', '/dmd2/osx/bin', '/dmd2/osx/lib')
	})

	test('Oldest allowed version', async () => {
	    const version = 'dmd-2.077.0-beta.1'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.077.0/dmd.2.077.0-beta.1.linux.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.077.0-beta.1', '/dmd2/linux/bin64', '/dmd2/linux/lib64')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.077.0/dmd.2.077.0-beta.1.windows.7z'
	    await doTest(version, url, url + '.sig',
			 '2.077.0-beta.1', '\\dmd2\\windows\\bin', [ '\\dmd2\\windows\\bin',
								     '\\dmd2\\windows\\bin64' ])

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.077.0/dmd.2.077.0-beta.1.osx.tar.xz'
	    await doTest(version, url, url + '.sig',
			 '2.077.0-beta.1', '/dmd2/osx/bin', '/dmd2/osx/lib')
	})
    })

    test('Test dmd-master CI builds', async () => {
	const version = 'dmd-master'
	let url

	Object.defineProperty(process, 'platform', { value: 'linux' })
	url = 'https://github.com/dlang/dmd/releases/download/nightly/dmd.master.linux.tar.xz'
	await doTest(version, url, undefined,
		     'master', '/dmd2/linux/bin64', '/dmd2/linux/lib64')

	Object.defineProperty(process, 'platform', { value: 'win32' })
	url = 'https://github.com/dlang/dmd/releases/download/nightly/dmd.master.windows.7z'
	await doTest(version, url, undefined,
		     'master', '\\dmd2\\windows\\bin64', [ '\\dmd2\\windows\\bin',
							    '\\dmd2\\windows\\bin64' ])

	Object.defineProperty(process, 'platform', { value: 'darwin' })
	url = 'https://github.com/dlang/dmd/releases/download/nightly/dmd.master.osx.tar.xz'
	await doTest(version, url, undefined,
		     'master', '/dmd2/osx/bin', '/dmd2/osx/lib')
    })

    describe('Changes in the archive structure', () => {
	let url: string

	test('Testing Windows 64 bit releases', async () => {
	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.090.1/dmd.2.090.1.windows.7z'
	    await doTest('dmd-2.090.1', url, url + '.sig',
			 '2.090.1', '\\dmd2\\windows\\bin', [ '\\dmd2\\windows\\bin',
							      '\\dmd2\\windows\\bin64' ])
	    url = 'https://downloads.dlang.org/pre-releases/2.x/2.091.0/dmd.2.091.0-beta.1.windows.7z'
	    await doTest('dmd-2.091.0-beta.1', url, url + '.sig',
			 '2.091.0-beta.1', '\\dmd2\\windows\\bin64', [ '\\dmd2\\windows\\bin',
								       '\\dmd2\\windows\\bin64' ])
	})

	test('Releases with only .zip archives', async () => {
	    const version = 'dmd-2.068.0'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.068.0/dmd.2.068.0.linux.zip'
	    await doTest(version, url, url + '.sig',
			 '2.068.0', '/dmd2/linux/bin64', '/dmd2/linux/lib64')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.068.0/dmd.2.068.0.windows.zip'
	    await doTest(version, url, url + '.sig',
			 '2.068.0', '\\dmd2\\windows\\bin', [ '\\dmd2\\windows\\bin',
							      '\\dmd2\\windows\\bin64' ])

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://downloads.dlang.org/releases/2.x/2.068.0/dmd.2.068.0.osx.zip'
	    await doTest(version, url, url + '.sig',
			 '2.068.0', '/dmd2/osx/bin', '/dmd2/osx/lib')
	})
    })

    test('Test that PATH on windows prioritizes 64-bit variant', async () => {
	Object.defineProperty(process, 'platform', { value: 'win32' })
	const dmd = await init('dmd-2.100.0')
	expect(dmd.libPaths).toStrictEqual([
	    // First must come the path with less precedence
	    '\\dmd2\\windows\\bin',
	    '\\dmd2\\windows\\bin64',
	])
    })
})

describe('Automatic version resolution', () => {
    function mockGetBody (latest: string, latest_beta: string) {
	async function mocker (url: string) {
	    switch (url) {
		case 'https://downloads.dlang.org/releases/LATEST':
		    return 'v' + latest
		case 'https://downloads.dlang.org/pre-releases/LATEST':
		    return 'v' + latest_beta
		default:
		    throw new Error(`Don't know how to mock URL: '${url}'`)
	    }
	}
	jest.spyOn(utils, 'body_as_text').mockImplementation(mocker)
    }

    function dmdMockTags (pages: string[][]) {
	testUtils.mockTags('https://api.github.com/repos/dlang/dmd/tags', pages);
	// Reset cached values by the DMD class
	(DMD as any).dmdTags.known = [] as string[]
	(DMD as any).dmdTags.lastPage = 1;
    }

    test('Test dmd-latest & dmd-beta & dmd', async () => {
	const latest = '2.109.0'
	const latest_beta = '2.109.1-rc.2'
	mockGetBody(latest, latest_beta)

	await expect(init('dmd-latest')).resolves.toHaveProperty(
	    'version', latest)
	await expect(init('dmd')).resolves.toHaveProperty(
	    'version', latest)
	await expect(init('dmd-beta')).resolves.toHaveProperty(
	    'version', latest_beta)
    })

    test('Test that dmd-beta is not older than dmd-latest', async () => {
	const latest = '2.109.0'
	const latest_beta = '2.109.0-beta.1'
	mockGetBody(latest, latest_beta)

	await expect(init('dmd-beta')).resolves.toHaveProperty(
	    'version', latest)
    })

    test('Test that dmd gracefully handles invalid server responses', async () => {
	const garbage = 'YaBaDaBaDoo'
	mockGetBody(garbage, garbage)

	await expect(init('dmd')).rejects.toThrow(garbage)
    })

    test('dmd-2.<minor> & dmd-2.<minor>b', async () => {
	const pages = [
	    [
		"v2.108.0-beta.2",
		"v2.108.0-beta.1",
		"v2.108.0",
	    ],
	    [
		"v2.108.0-rc.1",
		"v2.108.0-beta.2",
		"v2.108.0-beta.1",
	    ],
	    [
		"v2.107.1",
		"v2.107.1-beta.1",
		"v2.107.0",
	    ],
	    [
		"v2.106.0",
		"v2.105.0",
	    ],
	]
	dmdMockTags(pages)

	await expect(init('dmd-2.108')).resolves.toHaveProperty(
	    'version', '2.108.0')
	await expect(init('dmd-2.108b')).resolves.toHaveProperty(
	    'version', '2.108.0-beta.2')
	await expect(init('dmd-2.107')).resolves.toHaveProperty(
	    'version', '2.107.1')
	await expect(init('dmd-2.106b')).resolves.toHaveProperty(
	    'version', '2.106.0')
	await expect(init('dmd-2.080')).rejects.toThrow('80')
	await expect(init('dmd-2.190')).rejects.toThrow('190')

	// Test if caching worked fine
	await expect(init('dmd-2.107b')).resolves.toHaveProperty(
	    'version', '2.107.1')
	await expect(init('dmd-2.108')).resolves.toHaveProperty(
	    'version', '2.108.0')
	await expect(init('dmd-2.108b')).resolves.toHaveProperty(
	    'version', '2.108.0-beta.2')
    })

    test('dmd^', async () => {
	const pages = [
	    [
		'v2.108.0',
		'v2.108.0-rc.1',
	    ],
	    [
		'v2.108.0-beta.1',
		'v2.107.1',
		'v2.107.0',
	    ],
	    [
		'v2.107.0-beta.2',
	    ],
	    [
		'v2.107.0-beta.1',
		'v2.106.2',
	    ],
	    [
		'v2.106.1',
		'v2.106.0',
		'v2.106.0-beta.1',
	    ],
	    [
		'v2.105.0',
	    ],
	    [
		'v2.104.0',
	    ]
	]
	dmdMockTags(pages)
	let latest, latest_beta

	latest = '2.108.0', latest_beta = '2.108.0-rc.1'
	mockGetBody(latest, latest_beta)
	await expect(init('dmd^2')).resolves.toHaveProperty(
	    'version', '2.106.2')
	await expect(init('dmd^1')).resolves.toHaveProperty(
	    'version', '2.107.1')

	latest = '2.107.1', latest_beta = '2.108.0-rc.1'
	mockGetBody(latest, latest_beta)
	await expect(init('dmd^1')).resolves.toHaveProperty(
	    'version', '2.106.2')
	await expect(init('dmd^3')).resolves.toHaveProperty(
	    'version', '2.104.0')

	latest = '2.110.0', latest_beta = '2.110.1-beta.1'
	mockGetBody(latest, latest_beta)
	await expect(init('dmd^5')).resolves.toHaveProperty(
	    'version', '2.105.0')
	await expect(init('dmd^1')).rejects.toThrow('109')
	let err = expect(init('dmd^190')).rejects
	err.toThrow('190')
	err.toThrow('110')

	latest = '2.125.0', latest_beta = '2.125.0-beta.2'
	mockGetBody(latest, latest_beta)
	await expect(init('dmd^20')).resolves.toHaveProperty(
	    'version', '2.105.0')
    })
})

test('dmd gracefully handles invalid versions', async () => {
    for (const bad of [ 'dmd-1', 'dmd-alpha', 'dmd-2.x' ])
	await expect(init(bad)).rejects.toThrow(bad)
    for (const unexpected of [ 'dub', 'ldc^4' ])
	await expect(init(unexpected)).rejects.toThrow('dmd')
})

// https://github.com/dlang-community/setup-dlang/issues/78
test("dmd doesn't fail on arm64 macos #78", async () => {
    Object.defineProperty(process, 'arch', { value: 'arm64' })
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    expect(init('dmd-2.109.0')).resolves.toHaveProperty('version', '2.109.0')
})

test('dmd fails on unsupported platforms', async () => {
    Object.defineProperty(process, 'platform', { value: 'freebsd' })
    expect(init('dmd-2.109.0')).rejects.toThrow(process.platform)
})


describe('Test makeAvailable', () => {
    const root = '/tmp/cache'
    const origEnv = process.env
    const origSep = SETTINGS.sep
    const origExeExt = SETTINGS.exeExt

    // This value is cached so it matches the host's
    const pathSep = (process.platform == 'win32' ? ';' : ':')

    beforeEach(() => {
	Object.defineProperty(process, 'arch', { value: 'x64' })
	jest.spyOn(tc, 'find').mockReturnValue(root)
	jest.spyOn(fs, 'existsSync').mockReturnValue(true)
	process.env['PATH'] = '/bin'
	process.env['LD_LIBRARY_PATH'] = ''
    })
    afterEach(() => {
        process.env = origEnv
        SETTINGS.sep = origSep
        SETTINGS.exeExt = origExeExt
    })

    test('linux', async () => {
	Object.defineProperty(process, 'platform', { value: 'linux' })
        SETTINGS.sep = '/'
        SETTINGS.exeExt = ''
	const dmd = await init('dmd-2.109.1')
	await dmd.makeAvailable()
	expect(process.env['PATH']).toBe(root + '/dmd2/linux/bin64' + pathSep + '/bin')
	expect(process.env['LD_LIBRARY_PATH']).toBe(root + '/dmd2/linux/lib64')
        expect(process.env['DC']).toBe(root + '/dmd2/linux/bin64/dmd')
        expect(process.env['DMD']).toBe(root + '/dmd2/linux/bin64/dmd')
    })

    test('osx', async () => {
	Object.defineProperty(process, 'platform', { value: 'darwin' })
        SETTINGS.sep = '/'
        SETTINGS.exeExt = ''
	const dmd = await init('dmd-2.109.1')
	await dmd.makeAvailable()
	expect(process.env['PATH']).toBe(root + '/dmd2/osx/bin' + pathSep + '/bin')
	expect(process.env['LD_LIBRARY_PATH']).toBe(root + '/dmd2/osx/lib')
        expect(process.env['DC']).toBe(root + '/dmd2/osx/bin/dmd')
        expect(process.env['DMD']).toBe(root + '/dmd2/osx/bin/dmd')
    })

    test('windows', async () => {
	Object.defineProperty(process, 'platform', { value: 'win32' })
        SETTINGS.sep = '\\'
        SETTINGS.exeExt = '.exe'
	const dmd = await init('dmd-2.109.1')
	await dmd.makeAvailable()

	const bits64 = root + '\\dmd2\\windows\\bin64'
	const bits32 = root + '\\dmd2\\windows\\bin'
	const splitPath = process.env['PATH']!.split(pathSep)
	const found64 = splitPath.indexOf(bits64)
	const found32 = splitPath.indexOf(bits32)
	// check that both folders appear in PATH
	expect(found64).toBeGreaterThanOrEqual(0)
	expect(found32).toBeGreaterThanOrEqual(0)
	// Check that the 64bit folder appears before the 32bit one
	expect(found64).toBeLessThan(found32)

        expect(process.env['DC']).toBe(root + `\\dmd2\\windows\\bin64\\dmd.exe`)
        expect(process.env['DMD']).toBe(root + `\\dmd2\\windows\\bin64\\dmd.exe`)
    })

    describe('Check that verify_sig is respected', () => {
        const save = SETTINGS.verifySig
        const gpgSpy = jest.spyOn(gpg, 'verify').mockResolvedValue(undefined)

        beforeEach(() => {
            jest.spyOn(tc, 'find').mockReturnValue(false)
            jest.spyOn(utils, 'downloadTool').mockResolvedValue('/tmp/p1')
            jest.spyOn(utils, 'extract').mockResolvedValue('/tmp/p2')
            jest.spyOn(tc, 'cacheDir').mockResolvedValue('/tmp/p3')
        })
        afterEach(() => SETTINGS.verifySig = save)

        test('verify_sig === false', async () => {
            SETTINGS.verifySig = false
            const dmd = await init('dmd-2.109.1')
            await dmd.makeAvailable()
            expect(gpgSpy).not.toHaveBeenCalled()
        })

        test('verify_sig === true', async () => {
            SETTINGS.verifySig = true
            const dmd = await init('dmd-2.109.1')
            await dmd.makeAvailable()
            expect(gpgSpy).toHaveBeenCalled()
        })
    })

    describe('test DC and DMD format', () => {
        const origDcFormat = SETTINGS.dcFormat
        afterEach(() => SETTINGS.dcFormat = origDcFormat)

        test('basename', async () => {
            SETTINGS.dcFormat = 'basename'
            SETTINGS.exeExt = '.exe'
            const dmd = await init('dmd-2.108')
            await dmd.makeAvailable()
            expect(process.env['DC']).toBe('dmd.exe')
            expect(process.env['DMD']).toBe('dmd.exe')
        })
    })
})
