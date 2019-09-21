# setup-dlang

Automatically downloads and installs the D programming language compiler [DMD](https://dlang.org) or [LDC](https://github.com/ldc-developers/ldc) and the package manager [dub](https://code.dlang.org) on Windows, Linux and OSX in a GitHub Action.

## Usage

Simply add the setup-dlang action to your GitHub Actions workflow to automatically download and install a D compiler and package manager bundled with the compiler or separately downloaded. The action will automatically add the D binaries to the `PATH` environment variable and set the `DC` environment variable to the selected compiler executable name.

Valid version examples are:
- `dmd-latest`
- `ldc-latest`
- `dmd-beta`
- `ldc-beta`
- `dmd-2.088.0`
- `dmd-2.088.0-beta.2`
- `ldc-1.17.0`
- `ldc-1.18.0-beta1`
- `dmd-master`
- `ldc-master`

All DMD versions of releases and pre-releases on http://downloads.dlang.org/releases/2.x/ and http://downloads.dlang.org/pre-releases/2.x/ are supported. For LDC all releases on https://github.com/ldc-developers/ldc/releases are available.

Additionally instead of a version for both DMD and LDC you can specify `-latest` to get the latest stable release of the compiler, use `-beta` to get the latest pre-release of the compiler and also use `-master` to get the newest nightly builds.

Basic usage:
```yml
steps:
    - uses: actions/checkout@v1
    - uses: mihails-strasuns/setup-dlang@v0.3.0
      with:
        compiler: dmd-2.088.0
    - name: Run tests
      run: dub test
```

Matrix testing: (newest DMD and LDC on current Ubuntu, Windows and MacOS versions)
```yml
name: Run all D Tests
on: [push, pull_request]

jobs:
    test:
        name: Dub Tests
        strategy:
            matrix:
                os: [ubuntu-latest, windows-latest, macOS-latest]
                dc: [dmd-latest, ldc-latest]
        runs-on: ${{ matrix.os }}
        steps:
            - uses: actions/checkout@v1

            - name: Install D compiler
              uses: mihails-strasuns/setup-dlang@v0.3.0
              with:
                  compiler: ${{ matrix.dc }}

            - name: Run tests
              run: dub -q test
```
