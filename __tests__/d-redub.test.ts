import { exeExt, Redub } from '../src/d'
import * as testUtils from './test-helpers.test'
import * as utils from  '../src/utils'

testUtils.saveProcessRestorePoint()
testUtils.disableNetwork()
testUtils.hideConsoleLogs()

function init (version: string) { return Redub.initialize(version, '') }

test('Test that redub uses osx-universal for macOS', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })

    Object.defineProperty(process, 'arch', { value: 'arm64' })
    await expect(init('v1.25.2')).resolves.toHaveProperty(
    'url', `https://github.com/MrcSnm/redub/releases/download/v1.25.2/redub-v1.25.2-osx-universal${exeExt}`)

    Object.defineProperty(process, 'arch', { value: 'x64' })
    await expect(init('v1.25.2')).resolves.toHaveProperty(
    'url', `https://github.com/MrcSnm/redub/releases/download/v1.25.2/redub-v1.25.2-osx-universal${exeExt}`)
})
