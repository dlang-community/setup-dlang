import { compiler } from '../src/compiler';

describe('Compiler description', () => {
    it('DMD good', async () => {
        let descr = compiler("dmd-2.088.0");

        switch (process.platform) {
            case "win32":
                expect(descr.url).toBe("http://downloads.dlang.org/releases/2.x/2.088.0/dmd.2.088.0.windows.7z");
                break;
            case "linux":
                expect(descr.url).toBe("http://downloads.dlang.org/releases/2.x/2.088.0/dmd.2.088.0.linux.tar.xz");
                break;
            case "darwin":
                expect(descr.url).toBe("http://downloads.dlang.org/releases/2.x/2.088.0/dmd.2.088.0.osx.tar.xz");
                break;
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
    });

    it('DMD bad', async () => {
        expect(() => { compiler("dmd-2.22"); }).toThrow();
    });

    it('LDC good', async () => {
        let descr = compiler("ldc-1.17.0");

        switch (process.platform) {
            case "win32":
                expect(descr.url).toBe("https://github.com/ldc-developers/ldc/releases/download/v1.17.0/ldc2-1.17.0-windows-multilib.7z");
                break;
            case "linux":
                expect(descr.url).toBe("https://github.com/ldc-developers/ldc/releases/download/v1.17.0/ldc2-1.17.0-linux-x86_64.tar.xz");
                break;
            case "darwin":
                expect(descr.url).toBe("https://github.com/ldc-developers/ldc/releases/download/v1.17.0/ldc2-1.17.0-osx-x86_64.tar.xz");
                break;
            default:
                throw new Error("unsupported platform: " + process.platform);
        }
    });

    it('LDC bad', async () => {
        expect(() => { compiler("ldc-222"); }).toThrow();
    });

    it('Unknown compiler', async () => {
        expect(() => { compiler("ddd-1.2.3"); }).toThrow();
    });
});
