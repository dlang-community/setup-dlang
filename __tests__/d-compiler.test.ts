import { Compiler } from '../src/d'
import fs from 'fs'
import SETTINGS from '../src/settings'

describe('Test Compiler class', () => {
    const logSpy = jest.spyOn(console, 'log').mockReturnValue(undefined)
    jest.spyOn(process.stdout, 'write').mockReturnValue(true)

    const originalEnv = process.env
    const originalSep = SETTINGS.sep
    const originalExeExt = SETTINGS.exeExt
    // This value is cached so it matches the host's
    const pathSep = (process.platform == 'win32' ? ';' : ':')

    afterEach(() => {
        process.env = originalEnv
        SETTINGS.sep = originalSep
        SETTINGS.exeExt = originalExeExt
    })

    beforeEach(() => logSpy.mockClear())

    const bin = '/relative/path/to/bin'
    const libs = [ '/first', '/second' ]
    const name = 'compiler_name'
    const dmdWrapper = 'dmd_wrapper'
    let c = new Compiler('url', undefined, name, 'ver', bin, libs, dmdWrapper)
    const root = '/root/folder'

    test('Test setting PATH', () => {
	process.env['PATH']='/bin'
	c.addBinPath(root)
	expect(process.env['PATH']).toBe(root + bin + pathSep + '/bin')
	expect(logSpy).toHaveBeenCalledTimes(1)
    })

    test('Test setting LD_LIBRARY_PATH on UNIX', () => {
	for (let platform of [ 'linux', 'freebsd', 'darwin' ]) {
	    Object.defineProperty(process, 'platform', { value: platform })

	    process.env['LD_LIBRARY_PATH']=''
	    jest.spyOn(fs, 'existsSync').mockReturnValue(true)

	    c.addLibPaths(root)
	    expect(process.env['LD_LIBRARY_PATH']).toBe(
		root + libs[1] + ':' + root + libs[0])
	    expect(logSpy).toHaveBeenCalledTimes(2)
	    expect(logSpy.mock.calls[0][0]).toMatch(root + libs[0])
	    expect(logSpy.mock.calls[1][0]).toMatch(root + libs[1])
	    logSpy.mockClear()

	    process.env['LD_LIBRARY_PATH']=''
	    jest.spyOn(fs, 'existsSync')
		.mockReturnValueOnce(false)
		.mockReturnValueOnce(true)

	    c.addLibPaths(root)
	    expect(process.env['LD_LIBRARY_PATH']).toBe(root + libs[1])
	    expect(logSpy).toHaveBeenCalledTimes(1)
	    expect(logSpy.mock.calls[0][0]).toMatch(root + libs[1])
	    logSpy.mockClear()
	}
    })

    test('Test setting PATH for libraries on windows', () => {
	Object.defineProperty(process, 'platform', { value: 'win32' })

	process.env['PATH']='\\bin'
	jest.spyOn(fs, 'existsSync').mockReturnValue(true)

	c.addLibPaths(root)
	expect(process.env['PATH']).toBe(
	    root + libs[1] + pathSep + root + libs[0] + pathSep + '\\bin')
	expect(logSpy).toHaveBeenCalledTimes(2)
	expect(logSpy.mock.calls[0][0]).toMatch(root + libs[0])
	expect(logSpy.mock.calls[1][0]).toMatch(root + libs[1])
	logSpy.mockClear()

	process.env['PATH']='\\dir'
	jest.spyOn(fs, 'existsSync')
	    .mockReturnValueOnce(true)
	    .mockReturnValueOnce(false)

	c.addLibPaths(root)
	expect(process.env['PATH']).toBe(root + libs[0] + pathSep + '\\dir')
	expect(logSpy).toHaveBeenCalledTimes(1)
	expect(logSpy.mock.calls[0][0]).toMatch(root + libs[0])
	logSpy.mockClear()
    })

    test('Test makeAvailable', async () => {
	jest.spyOn(c, 'getCached').mockResolvedValue(root)

        SETTINGS.sep = '/'
        SETTINGS.exeExt = ''
	for (const platform of [ 'linux', 'darwin', 'freebsd' ]) {
	    Object.defineProperty(process, 'platform', { value: platform })
	    jest.spyOn(fs, 'existsSync').mockReturnValue(true).
		mockReturnValueOnce(false)

	    process.env['PATH'] = '/bin'
	    process.env['LD_LIBRARY_PATH'] = ''
	    await c.makeAvailable()

	    expect(process.env['PATH']).toBe(root + bin + pathSep + '/bin')
	    expect(process.env['LD_LIBRARY_PATH']).toBe(root + libs[1])
        expect(process.env['DC']).toBe(`${root}${bin}/${name}`)
        expect(process.env['DMD']).toBe(`${root}${bin}/${dmdWrapper}`)
	}


        SETTINGS.sep = '\\'
        SETTINGS.exeExt = '.exe'
	Object.defineProperty(process, 'platform', { value: 'win32' })
	jest.spyOn(fs, 'existsSync').mockReturnValue(true)

	process.env['PATH'] = '\\bin'
	await c.makeAvailable()

	const expPath = `${root}${libs[1]}${pathSep}` + `${root}${libs[0]}${pathSep}` +
	    `${root}${bin}${pathSep}` + '\\bin'
	expect(process.env['PATH']).toBe(expPath)
        expect(process.env['DC']).toBe(`${root}${bin}\\${name}.exe`)
        expect(process.env['DMD']).toBe(`${root}${bin}\\${dmdWrapper}.exe`)
    })

    describe('Test DC and DMD path format', () => {
        const origDcFormat = SETTINGS.dcFormat
        beforeEach(() => SETTINGS.sep = '/')
        afterEach(() => SETTINGS.dcFormat = origDcFormat)

        test('default is absolute', () => {
            SETTINGS.exeExt = '.exe'
            c.setDC(root)
            expect(process.env['DC']).toBe(root + bin + '/' + name + '.exe')
            expect(process.env['DMD']).toBe(root + bin + '/' + dmdWrapper + '.exe')
        })

        test('explicit absolute', () => {
            SETTINGS.exeExt = ''
            SETTINGS.dcFormat = 'absolute'
            c.setDC(root)
            expect(process.env['DC']).toBe(root + bin + '/' + name)
            expect(process.env['DMD']).toBe(root + bin + '/' + dmdWrapper)
        })

        describe('basename', () => {
            beforeEach(() => SETTINGS.dcFormat = 'basename')
            test('posix', () => {
                SETTINGS.exeExt = ''
                c.setDC(root)
                expect(process.env['DC']).toBe(name)
                expect(process.env['DMD']).toBe(dmdWrapper)
            })

            test('windows', () => {
                SETTINGS.exeExt = '.exe'
                c.setDC(root)
                expect(process.env['DC']).toBe(name + '.exe')
                expect(process.env['DMD']).toBe(dmdWrapper + '.exe')
            })
        })

        describe('shortname', () => {
            beforeEach(() => SETTINGS.dcFormat = 'shortname')
            test('posix', () => {
                SETTINGS.exeExt = ''
                c.setDC(root)
                expect(process.env['DC']).toBe(name)
                expect(process.env['DMD']).toBe(dmdWrapper)
            })

            test('windows', () => {
                SETTINGS.exeExt = '.exe'
                c.setDC(root)
                expect(process.env['DC']).toBe(name)
                expect(process.env['DMD']).toBe(dmdWrapper)
            })
        })
    })
})
