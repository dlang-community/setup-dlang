import { LDC } from '../src/d'
import * as utils from '../src/utils'
import * as testUtils from './test-helpers.test'
import * as tc from '@actions/tool-cache'
import fs from 'fs'
import SETTINGS from '../src/settings'

testUtils.saveProcessRestorePoint()
testUtils.disableNetwork()
testUtils.hideConsoleLogs()

async function doTest(input: string, url: string, sig: string | undefined,
		      version: string, binPath: string, libPaths: string | string[]) {
    const ldc = await LDC.initialize(input, '')
    expect(ldc.url).toBe(url)
    expect(ldc.sig).toBe(sig)
    expect(ldc.name).toBe('ldc2')
    expect(ldc.version).toBe(version)
    expect(ldc.binPath).toBe(binPath)
    const libs = typeof libPaths === 'string' ? [ libPaths ] : libPaths
    for (const lib of libs)
	expect(ldc.libPaths).toContain(lib)
}
function init (version: string) { return LDC.initialize(version, ''); }
function mockLdcMaster(sha: string, systems?: string[]) {
    if (sha.length != 8)
	throw new Error('Ldc CI releases use the first 8 characters of the commit sha')
    if (systems === undefined)
	systems = [
	    // 'src.tar.gz'
	    // 'src.zip'
	    "android-aarch64.tar.xz",
	    "android-armv7a.tar.xz",
	    "freebsd-x86_64.tar.xz",
	    "linux-aarch64.tar.xz",
	    "linux-x86_64.tar.xz",
	    "osx-arm64.tar.xz",
	    "osx-universal.tar.xz",
	    "osx-x86_64.tar.xz",
	    "windows-multilib.7z",
	    "windows-multilib.exe",
	    "windows-x64.7z",
	    "windows-x86.7z",
	    // 'sha256sums.txt',
	]

    const dateString = '2024-07-07T10:24:26Z'
    let assets: { name: string, updated_at: string}[] = []
    assets.push({
	name: `ldc-${sha}-src.tar.gz`,
	updated_at: dateString,
    })
    assets.push({
	name: `ldc-${sha}-src.zip`,
	updated_at: dateString,
    })
    for (const system of systems)
	assets.push({
	    name: `ldc2-${sha}-${system}`,
	    updated_at: dateString,
	})
    assets.push({
	name: `ldc2-${sha}.sha256sums.txt`,
	updated_at: dateString,
    })

    const jsonResponse = JSON.stringify({ assets })
    async function mocker (url: string) {
	expect(url).toBe('https://api.github.com/repos/ldc-developers/ldc/releases/tags/CI')
	return jsonResponse
    }
    jest.spyOn(utils, 'body_as_text').mockImplementation(mocker)
}

describe('amd64', () => {
    beforeEach(() => Object.defineProperty(process, 'arch', { value: 'x64' }))
    let url

    describe('Test exact version', () => {
	test('A recent version', async () => {
	    const version = 'ldc-1.39.0'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.39.0/ldc2-1.39.0-linux-x86_64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.39.0', '/ldc2-1.39.0-linux-x86_64/bin', '/ldc2-1.39.0-linux-x86_64/lib')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.39.0/ldc2-1.39.0-windows-multilib.7z'
	    await doTest(version, url, undefined,
			 '1.39.0', '\\ldc2-1.39.0-windows-multilib\\bin', '\\ldc2-1.39.0-windows-multilib\\lib64')

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.39.0/ldc2-1.39.0-osx-universal.tar.xz'
	    await doTest(version, url, undefined,
			 '1.39.0', '/ldc2-1.39.0-osx-universal/bin', '/ldc2-1.39.0-osx-universal/lib-x86_64')
	})

	test('An older version', async () => {
	    const version = 'ldc-1.27.0'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.27.0/ldc2-1.27.0-linux-x86_64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.27.0', '/ldc2-1.27.0-linux-x86_64/bin', '/ldc2-1.27.0-linux-x86_64/lib')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.27.0/ldc2-1.27.0-windows-multilib.7z'
	    await doTest(version, url, undefined,
			 '1.27.0', '\\ldc2-1.27.0-windows-multilib\\bin', '\\ldc2-1.27.0-windows-multilib\\lib64')

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.27.0/ldc2-1.27.0-osx-x86_64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.27.0', '/ldc2-1.27.0-osx-x86_64/bin', '/ldc2-1.27.0-osx-x86_64/lib')
	})

	test('A very old version', async () => {
	    const version = 'ldc-1.19.0' // oldest used by ldc CI

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.19.0/ldc2-1.19.0-linux-x86_64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.19.0', '/ldc2-1.19.0-linux-x86_64/bin', '/ldc2-1.19.0-linux-x86_64/lib')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.19.0/ldc2-1.19.0-windows-multilib.7z'
	    await doTest(version, url, undefined,
			 '1.19.0', '\\ldc2-1.19.0-windows-multilib\\bin', '\\ldc2-1.19.0-windows-multilib\\lib64')

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.19.0/ldc2-1.19.0-osx-x86_64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.19.0', '/ldc2-1.19.0-osx-x86_64/bin', '/ldc2-1.19.0-osx-x86_64/lib')
	})
    })

    describe('Test exact prerelease version', () => {
	test('A recent version', async () => {
	    const version = 'ldc-1.39.0-beta1'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.39.0-beta1/ldc2-1.39.0-beta1-linux-x86_64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.39.0-beta1', '/ldc2-1.39.0-beta1-linux-x86_64/bin', '/ldc2-1.39.0-beta1-linux-x86_64/lib')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.39.0-beta1/ldc2-1.39.0-beta1-windows-multilib.7z'
	    await doTest(version, url, undefined,
			 '1.39.0-beta1', '\\ldc2-1.39.0-beta1-windows-multilib\\bin', '\\ldc2-1.39.0-beta1-windows-multilib\\lib64')

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.39.0-beta1/ldc2-1.39.0-beta1-osx-universal.tar.xz'
	    await doTest(version, url, undefined,
			 '1.39.0-beta1', '/ldc2-1.39.0-beta1-osx-universal/bin', '/ldc2-1.39.0-beta1-osx-universal/lib-x86_64')
	})

	test('An older version', async () => {
	    const version = 'ldc-1.33.0-beta2'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.33.0-beta2/ldc2-1.33.0-beta2-linux-x86_64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.33.0-beta2', '/ldc2-1.33.0-beta2-linux-x86_64/bin', '/ldc2-1.33.0-beta2-linux-x86_64/lib')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.33.0-beta2/ldc2-1.33.0-beta2-windows-multilib.7z'
	    await doTest(version, url, undefined,
			 '1.33.0-beta2', '\\ldc2-1.33.0-beta2-windows-multilib\\bin', '\\ldc2-1.33.0-beta2-windows-multilib\\lib64')

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.33.0-beta2/ldc2-1.33.0-beta2-osx-universal.tar.xz'
	    await doTest(version, url, undefined,
			 '1.33.0-beta2', '/ldc2-1.33.0-beta2-osx-universal/bin', '/ldc2-1.33.0-beta2-osx-universal/lib-x86_64')
	})

	test('A very old version', async () => {
	    const version = 'ldc-1.20.0-beta1' // oldest used by ldc CI

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.20.0-beta1/ldc2-1.20.0-beta1-linux-x86_64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.20.0-beta1', '/ldc2-1.20.0-beta1-linux-x86_64/bin', '/ldc2-1.20.0-beta1-linux-x86_64/lib')

	    Object.defineProperty(process, 'platform', { value: 'win32' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.20.0-beta1/ldc2-1.20.0-beta1-windows-multilib.7z'
	    await doTest(version, url, undefined,
			 '1.20.0-beta1', '\\ldc2-1.20.0-beta1-windows-multilib\\bin', '\\ldc2-1.20.0-beta1-windows-multilib\\lib64')

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.20.0-beta1/ldc2-1.20.0-beta1-osx-x86_64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.20.0-beta1', '/ldc2-1.20.0-beta1-osx-x86_64/bin', '/ldc2-1.20.0-beta1-osx-x86_64/lib')
	})
    })

    test('Test ldc-master URL resolver', async () => {
	const sha = '07ee665a'
	mockLdcMaster(sha)

	Object.defineProperty(process, 'platform', { value: 'linux' })
	await expect(init('ldc-master')).resolves.toMatchObject({
	    url: 'https://github.com/ldc-developers/ldc/releases/download/CI/ldc2-07ee665a-linux-x86_64.tar.xz'})

	Object.defineProperty(process, 'platform', { value: 'win32' })
	await expect(init('ldc-master')).resolves.toMatchObject({
	    url: 'https://github.com/ldc-developers/ldc/releases/download/CI/ldc2-07ee665a-windows-multilib.7z'})

	Object.defineProperty(process, 'platform', { value: 'darwin' })
	await expect(init('ldc-master')).resolves.toMatchObject({
	    url: 'https://github.com/ldc-developers/ldc/releases/download/CI/ldc2-07ee665a-osx-universal.tar.xz'})
    })
})

describe('arm64', () => {
    beforeEach(() => Object.defineProperty(process, 'arch', { value: 'arm64' }))
    let url

    describe('Test exact version', () => {
	test('A recent version', async () => {
	    const version = 'ldc-1.38.0'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.38.0/ldc2-1.38.0-linux-aarch64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.38.0', '/ldc2-1.38.0-linux-aarch64/bin', '/ldc2-1.38.0-linux-aarch64/lib')

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.38.0/ldc2-1.38.0-osx-universal.tar.xz'
	    await doTest(version, url, undefined,
			 '1.38.0', '/ldc2-1.38.0-osx-universal/bin', '/ldc2-1.38.0-osx-universal/lib-arm64')
	})

	test('An older prerelease version', async () => {
	    const version = 'ldc-1.31.0-beta1'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.31.0-beta1/ldc2-1.31.0-beta1-linux-aarch64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.31.0-beta1', '/ldc2-1.31.0-beta1-linux-aarch64/bin', '/ldc2-1.31.0-beta1-linux-aarch64/lib')

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.31.0-beta1/ldc2-1.31.0-beta1-osx-universal.tar.xz'
	    await doTest(version, url, undefined,
			 '1.31.0-beta1', '/ldc2-1.31.0-beta1-osx-universal/bin', '/ldc2-1.31.0-beta1-osx-universal/lib-arm64')
	})

	test('A very old version', async () => {
	    const version = 'ldc-1.26.0'

	    Object.defineProperty(process, 'platform', { value: 'linux' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.26.0/ldc2-1.26.0-linux-aarch64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.26.0', '/ldc2-1.26.0-linux-aarch64/bin', '/ldc2-1.26.0-linux-aarch64/lib')

	    Object.defineProperty(process, 'platform', { value: 'darwin' })
	    url = 'https://github.com/ldc-developers/ldc/releases/download/v1.26.0/ldc2-1.26.0-osx-arm64.tar.xz'
	    await doTest(version, url, undefined,
			 '1.26.0', '/ldc2-1.26.0-osx-arm64/bin', '/ldc2-1.26.0-osx-arm64/lib')
	})
    })

    test('Test oldest supported releases', async () => {
	Object.defineProperty(process, 'platform', { value: 'linux' })
	url = 'https://github.com/ldc-developers/ldc/releases/download/v1.11.0/ldc2-1.11.0-linux-aarch64.tar.xz'
	await doTest('ldc-1.11.0', url, undefined,
		     '1.11.0', '/ldc2-1.11.0-linux-aarch64/bin', '/ldc2-1.11.0-linux-aarch64/lib')

	Object.defineProperty(process, 'platform', { value: 'darwin' })
	url = 'https://github.com/ldc-developers/ldc/releases/download/v1.25.0/ldc2-1.25.0-osx-arm64.tar.xz'
	await doTest('ldc-1.25.0', url, undefined,
		     '1.25.0', '/ldc2-1.25.0-osx-arm64/bin', '/ldc2-1.25.0-osx-arm64/lib')
    })


    test('Test ldc-master URL resolver', async () => {
	const sha = '07ee665a'
	mockLdcMaster(sha)

	Object.defineProperty(process, 'platform', { value: 'linux' })
	await expect(init('ldc-master')).resolves.toMatchObject({
	    url: 'https://github.com/ldc-developers/ldc/releases/download/CI/ldc2-07ee665a-linux-aarch64.tar.xz',
	})

	Object.defineProperty(process, 'platform', { value: 'darwin' })
	await expect(init('ldc-master')).resolves.toMatchObject({
	    url: 'https://github.com/ldc-developers/ldc/releases/download/CI/ldc2-07ee665a-osx-universal.tar.xz',
	})
    })
})

describe('Changes in the archive format', () => {
    test('Universal macos archives', async () => {
	Object.defineProperty(process, 'arch', { value: 'arm64' })
	Object.defineProperty(process, 'platform', { value: 'darwin' })
	const withUniversal = 'ldc-1.30.0-beta1'
	const withoutUniversal = 'ldc-1.29.0'
	let url

	url = 'https://github.com/ldc-developers/ldc/releases/download/v1.30.0-beta1/ldc2-1.30.0-beta1-osx-universal.tar.xz'
	await doTest(withUniversal, url, undefined,
		     '1.30.0-beta1', '/ldc2-1.30.0-beta1-osx-universal/bin', '/ldc2-1.30.0-beta1-osx-universal/lib-arm64')

	url = 'https://github.com/ldc-developers/ldc/releases/download/v1.29.0/ldc2-1.29.0-osx-arm64.tar.xz'
	await doTest(withoutUniversal, url, undefined,
	       '1.29.0', '/ldc2-1.29.0-osx-arm64/bin', '/ldc2-1.29.0-osx-arm64/lib')
    })
})

describe('Test automatic version resolution', () => {
    function mockLatest(latest: string, latestBeta: string) {
	async function mocker (url: string) {
	    switch (url) {
		case 'https://ldc-developers.github.io/LATEST':
		    return latest
		case 'https://ldc-developers.github.io/LATEST_BETA':
		    return latestBeta
		default:
		    throw new Error(`I don't know how to mock requests to '${url}'`)
	    }
	}
	jest.spyOn(utils, 'body_as_text').mockImplementation(mocker)
    }

    test('ldc & ldc-latest & ldc-beta', async () => {
	let latest = '1.39.0', latestBeta = '1.39.0'
	mockLatest(latest, latestBeta)

	await expect(init('ldc')).resolves.toHaveProperty('version', latest)
	await expect(init('ldc-latest')).resolves.toHaveProperty('version', latest)
	await expect(init('ldc-beta')).resolves.toHaveProperty('version', latest)

	latest = '1.36.1', latestBeta = '1.37.0-beta1'
	mockLatest(latest, latestBeta)
	await expect(init('ldc')).resolves.toHaveProperty('version', latest)
	await expect(init('ldc-latest')).resolves.toHaveProperty('version', latest)
	await expect(init('ldc-beta')).resolves.toHaveProperty('version', latestBeta)
    })

    test('ldc-<major>.<minor>', async () => {
	const pages = [
	    [
		'dmd-rewrite-v2.109.1',
		'dmd-rewrite-v2.109.1-rc.1',
		'v1.39.0-beta1',
		'dmd-rewrite-v2.109.0',
		'v1.38.0',
	    ],
	    [
		'dmd-rewrite-v2.109.0-beta.1',
		'dmd-rewrite-v2.108.1',
		'v1.37.0',
		'v1.37.0-beta2',
	    ],
	    [
		'v1.37.0-beta1',
		'v1.36.1',
		'v1.36.0',
	    ],
	    [
		'v1.36.0-beta1',
		'v1.35.0',
		'v1.34.0',
		'v0.1.17',
		'v0.0.16-alpha2',
	    ]
	]
	testUtils.mockTags('https://api.github.com/repos/ldc-developers/ldc/tags', pages)

	await expect(init('ldc-1.38')).resolves.toHaveProperty('version', '1.38.0')
	await expect(init('ldc-1.39')).rejects.toThrow('1.39')
	await expect(init('ldc-1.39b')).resolves.toHaveProperty('version', '1.39.0-beta1')

	await expect(init('ldc-1.35b')).resolves.toHaveProperty('version', '1.35.0')

	await expect(init('ldc-0.1')).resolves.toHaveProperty('version', '0.1.17')

	await expect(init('ldc-1.30')).rejects.toThrow('1.30')
    })

    test('ldc^', async () => {
	const pages = [ [
	    'v1.39.0',
	    'v1.39.0-beta1',
	    'v1.38.0',
	    'v1.37.1',
	    'v1.37.0',
	    'v1.30.0-beta1',
	    'v1.29.0',
	    'v1.28.0',
	    'v1.27.0',
	    'v1.19.0',
	    'v1.9.0',
	    'v1.9.0-beta1',
	    'v0.4.0',
	] ]
	testUtils.mockTags('https://api.github.com/repos/ldc-developers/ldc/tags', pages)
	let latest, latestBeta

	latest = 'v1.39.0', latestBeta = 'v1.39.0'
	mockLatest(latest, latestBeta)
	await expect(init('ldc^2')).resolves.toHaveProperty('version', '1.37.1')
	await expect(init('ldc^9')).rejects.toThrow('1.30')
	await expect(init('ldc^10')).resolves.toHaveProperty('version', '1.29.0')

	latest = 'v1.29.0', latestBeta = 'v1.30.0-beta1'
	mockLatest(latest, latestBeta)
	await expect(init('ldc^1')).resolves.toHaveProperty('version', '1.28.0')
	await expect(init('ldc^20')).resolves.toHaveProperty('version', '1.9.0')
	await expect(init('ldc^137')).rejects.toThrow('137')
	await expect(init('ldc^25')).rejects.toThrow('1.4')
    })
})

test('ldc gracefully handles invalid versions', async () => {
    for (const bad of [ 'ldc-1', 'ldc-alpha', 'ldc-1.x', 'garbage', 'dmd-2.109.0' ])
	await expect(() => init(bad)).rejects.toThrow(bad)
})

test('ldc-master gracefully handles missing platform releases', async () => {
    const sha = '07ee665a'
    mockLdcMaster(sha, [ 'linux-x86_64.tar.xz', 'osx-universal.tar.xz' ])

    Object.defineProperty(process, 'platform', { value: 'linux' })

    Object.defineProperty(process, 'arch', { value: 'arm64' })
    await expect(init('ldc-master')).rejects.toThrow('linux-aarch64')
    Object.defineProperty(process, 'arch', { value: 'x64' })
    await expect(init('ldc-master')).resolves.toHaveProperty(
	'url', expect.stringContaining('linux-x86_64'))
})

test('ldc-master picks the most recent CI release for a platform', async () => {
    const sha1 = '01ab3cd8', sha2 = 'bf3aff10'
    jest.spyOn(utils, 'body_as_text').mockResolvedValue(JSON.stringify({
	assets: [ {
	    name: `ldc2-${sha1}-linux-x86_64.tar.xz`,
	    updated_at: '2024-07-07T10:24:26Z',
	}, {
	    name: `ldc2-${sha2}-linux-x86_64.tar.xz`,
	    updated_at: '2024-07-08T10:24:26Z',
	} ] }))

    Object.defineProperty(process, 'platform', { value: 'linux' })
    Object.defineProperty(process, 'arch', { value: 'x64' })
    await expect(init('ldc-master')).resolves.toHaveProperty('version', sha2)
})

test('ldc-master gracefully handles malformed assets', async () => {
    jest.spyOn(utils, 'body_as_text').mockResolvedValue(JSON.stringify({assets: []}))
    await expect(init('ldc-master')).rejects.toThrow(/ldc/i)
    jest.spyOn(utils, 'body_as_text').mockResolvedValue(JSON.stringify({releases: []}))
    await expect(init('ldc-master')).rejects.toThrow(/ldc/i)
})

test('ldc fails on unsupported platforms', async () => {
    Object.defineProperty(process, 'platform', { value: 'freebsd' })
    expect(init('ldc-1.39.0')).rejects.toThrow(process.platform)
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
	const ldc = await init('ldc-1.39.0')
	await ldc.makeAvailable()
	expect(process.env['PATH']).toBe(root + '/ldc2-1.39.0-linux-x86_64/bin' + pathSep + '/bin')
	expect(process.env['LD_LIBRARY_PATH']).toBe(root + '/ldc2-1.39.0-linux-x86_64/lib')
        expect(process.env['DC']).toBe(root + '/ldc2-1.39.0-linux-x86_64/bin/ldc2')
        expect(process.env['DMD']).toBe(root + '/ldc2-1.39.0-linux-x86_64/bin/ldmd2')
    })

    test('osx', async () => {
	Object.defineProperty(process, 'platform', { value: 'darwin' })
        SETTINGS.sep = '/'
        SETTINGS.exeExt = ''
	const ldc = await init('ldc-1.39.0')
	await ldc.makeAvailable()
	expect(process.env['PATH']).toBe(root + '/ldc2-1.39.0-osx-universal/bin' + pathSep + '/bin')
	expect(process.env['LD_LIBRARY_PATH']).toBe(root + '/ldc2-1.39.0-osx-universal/lib-x86_64' + ':' + root + '/ldc2-1.39.0-osx-universal/lib-arm64')
        expect(process.env['DC']).toBe(root + '/ldc2-1.39.0-osx-universal/bin/ldc2')
        expect(process.env['DMD']).toBe(root + '/ldc2-1.39.0-osx-universal/bin/ldmd2')
    })

    test('windows', async () => {
	Object.defineProperty(process, 'platform', { value: 'win32' })
        SETTINGS.sep = '\\'
        SETTINGS.exeExt = '.exe'
	const ldc = await init('ldc-1.39.0')
	await ldc.makeAvailable()
	expect(process.env['PATH']).toBe(root + '\\ldc2-1.39.0-windows-multilib\\lib64' + pathSep + root + '\\ldc2-1.39.0-windows-multilib\\bin' + pathSep + '/bin')
        expect(process.env['DC']).toBe(root + '\\ldc2-1.39.0-windows-multilib\\bin\\ldc2.exe')
        expect(process.env['DMD']).toBe(root + '\\ldc2-1.39.0-windows-multilib\\bin\\ldmd2.exe')
    })
})
