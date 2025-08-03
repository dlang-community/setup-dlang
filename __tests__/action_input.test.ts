import * as main from '../src/main'
import * as core from '@actions/core'
import * as d from '../src/d'
import * as testUtils from './test-helpers.test'
testUtils.saveProcessRestorePoint()
testUtils.disableNetwork()

describe('Testing compiler when...', function(){
    beforeAll(() => jest.spyOn(core, 'getInput').mockReturnValue(''))

    test('it is unspecified', () => {
	Object.defineProperty(process, 'arch', { value: 'x64' })
	expect(main.getActionInputs()).toStrictEqual({
	    d_compiler: 'dmd-latest', gh_token: '', dub_version: '', gdmd_sha: '',})

	Object.defineProperty(process, 'arch', { value: 'arm64' })
	expect(main.getActionInputs()).toStrictEqual({
	    d_compiler: 'ldc-latest', gh_token: '', dub_version: '', gdmd_sha: '',})
    })

    function mockCompiler(compiler: string) {
	jest.spyOn(core, 'getInput').mockImplementation((key) => {
	    if (key == "compiler")
		return compiler
	    return ""
	})
    }

    test('it is specified', () => {
	Object.defineProperty(process, 'arch', { value: 'x64' })
	mockCompiler('ldc')
	expect(main.getActionInputs()).toStrictEqual({
	    d_compiler: 'ldc', gh_token: '', dub_version: '', gdmd_sha: '',})

	Object.defineProperty(process, 'arch', { value: 'x64' })
	mockCompiler('invalid text')
	expect(main.getActionInputs()).toStrictEqual({
	    d_compiler: 'invalid text', gh_token: '', dub_version: '', gdmd_sha: '',})
    })

    // https://github.com/dlang-community/setup-dlang/issues/78
    test('it is dmd on arm64 issue#78', () => {
	Object.defineProperty(process, 'arch', { value: 'arm64' })
	mockCompiler('dmd-beta')
	expect(main.getActionInputs()).toHaveProperty('d_compiler', 'dmd-beta')
    })
});

test('All action inputs', () => {
    jest.spyOn(core, 'getInput').mockImplementation((key) => {
	switch (key) {
	    case "compiler":
		return "x"
	    case "dub":
		return "y"
	    case "gh_token":
		return "z"
	    case "gdmd_sha":
		return "t"
	    default:
		throw new Error(`Unknown key '${key}'`)
	}
    })

    expect(main.getActionInputs()).toStrictEqual({
	d_compiler: 'x', dub_version: 'y', gh_token: 'z', gdmd_sha: 't'
    })
})

describe('Action messages', () => {
    let nopTool = { makeAvailable: jest.fn() }
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    beforeAll(() => {
	// Bypass type safety
	jest.spyOn(d.DMD, 'initialize').mockResolvedValue(<any>nopTool)
	jest.spyOn(d.LDC, 'initialize').mockResolvedValue(<any>nopTool)
	jest.spyOn(d.GDC, 'initialize').mockResolvedValue(<any>nopTool)
	jest.spyOn(d.Dub, 'initialize').mockResolvedValue(<any>nopTool)
	// Silence the failures
	jest.spyOn(core, 'setFailed').mockImplementation(() => {})
    })
    beforeEach(() => jest.clearAllMocks())

    function mockInputs(compiler: string, dub: string = '') {
	jest.spyOn(core, 'getInput').mockImplementation((key) => {
	    if (key == "compiler")
		return compiler
	    else if (key == 'dub')
		return dub
	    return ''
	})
    }

    test('Specifying both compiler and dub', async () => {
	let compString = 'dmd-2.110.0-beta.1'
	let dubString = 'dub-secret-version'
	mockInputs(compString, dubString)
	await main.run()

	expect(nopTool.makeAvailable).toHaveBeenCalledTimes(2)
	expect(consoleSpy.mock.calls.length).toBe(2)
	expect(consoleSpy.mock.calls[0][0]).toMatch(compString)
	expect(consoleSpy.mock.calls[0][0]).toMatch(dubString)
	expect(consoleSpy.mock.calls[1][0]).toMatch('Done')
    })

    test('Specifying only the compiler', async () => {
	let compString = 'dmd-2.110.0-beta.1'
	mockInputs(compString)
	await main.run()

	expect(nopTool.makeAvailable).toHaveBeenCalledTimes(1)
	expect(consoleSpy.mock.calls.length).toBe(2)
	expect(consoleSpy.mock.calls[0][0]).toMatch(compString)
	expect(consoleSpy.mock.calls[0][0]).not.toMatch('dub')
	expect(consoleSpy.mock.calls[1][0]).toMatch('Done')
    })

    test('Specifying an invalid compiler', async () => {
	let compString = 'this-is-not-a-real-compiler'
	mockInputs(compString)
	await main.run()

	expect(nopTool.makeAvailable).toHaveBeenCalledTimes(0)
	expect(consoleSpy).toHaveBeenCalledTimes(1)
	expect(consoleSpy.mock.calls[0][0]).toMatch(compString)
    })

    test('Specifying a valid compiler', async () => {
	// This is only for coverage's sake
	for (var comp of [ 'dmd', 'ldc-11.3.0', 'gdc-12' ]) {
	    mockInputs(comp)
	    await main.run()
	    expect(nopTool.makeAvailable).toHaveBeenCalled()
	    expect(consoleSpy).toHaveBeenCalledTimes(2)
	    nopTool.makeAvailable.mockClear()
	    consoleSpy.mockClear()
	}
    })

    test('Errors are caught and displayed', async () => {
	let msg = 'dmd-secret-recipe'
	jest.spyOn(d.DMD, 'initialize').mockImplementation(async () => {
	    throw Error(msg)
	})
	mockInputs('dmd')
	await main.run()
	expect(consoleSpy).toHaveBeenCalledTimes(1)
	expect(consoleSpy.mock.calls[0][0]).toMatch(msg)
    })
})

describe('dub default input', () => {
    function mockCompiler(compiler: string) {
        jest.spyOn(core, 'getInput').mockImplementation((key) => {
            switch (key) {
                case 'compiler':
                    return compiler
                case 'dub':
                    return 'any'
                default:
                    return ''
            }
        })
    }

    test('with gdc dub is latest', () => {
        mockCompiler('gdc-14')
        const got = main.getActionInputs()
        expect(got.dub_version).toBe('latest')
    })

    test('with dmd dub is empty', async () => {
        mockCompiler('dmd')
        const got = main.getActionInputs()
        expect(got.dub_version).toBe('')
    })

    test('without a compiler specified dub is empty', async () => {
        mockCompiler('')
        const got = main.getActionInputs()
        expect(got.dub_version).toBe('')
    })
})
