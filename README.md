# setup-dlang

Automatically downloads and installs the D programming language compiler [DMD](https://dlang.org) or [LDC](https://github.com/ldc-developers/ldc) and the package manager [dub](https://code.dlang.org) on Windows, Linux and OSX in a GitHub Action.
Support for [GDC](https://gdcproject.org/) is also available but only on Linux.

## Usage

Basic usage:
```yml
steps:
  - uses: actions/checkout@v4
  - uses: dlang-community/setup-dlang@v2
    with:
      compiler: dmd
  - name: Run tests
    run: dub test
```

Matrix testing:
```yml
name: Run all D Tests
on: [push, pull_request]

jobs:
  test:
    name: Dub Tests
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macOS-13]
        dc: [dmd, ldc, dmd-2.085.0, ldc-1.17.0 ]
        exclude:
          - { os: macOS-13, dc: dmd-2.085.0 }

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Install D compiler
        uses: dlang-community/setup-dlang@v2
        with:
          compiler: ${{ matrix.dc }}

      - name: Run tests
        shell: bash
        run: dub -q test
```
The above example tests 11 possible combinations: the latest `dmd` and latest `ldc` on all three platforms,
`ldc-1.17.0` on all three platforms, and `dmd-2.085.0` on `ubuntu-latest` and `windows-latest`.

Gdc usage:
```yml
name: Run all D Tests
on: [push, pull_request]

jobs:
  test:
    name: Dub Tests
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macOS-latest]
        dc: [dmd, ldc, gdc-12]
        # You have to exclude gdc configurations from non-linux OSes
        exclude:
          - { os: windows-latest, dc: gdc-12 }
          - { os: macOS-latest, dc: gdc-12 }
        # Or include them manually
        include:
          - { os: ubuntu-latest, dc: gdc }

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Install D compiler
        uses: dlang-community/setup-dlang@v2
        with:
          compiler: ${{ matrix.dc }}
          # dub doesn't come with gdc.
          # You wouldn't need the line below if only using dmd or ldc
          dub: latest

      - name: Run tests
        shell: bash
        run: dub -q test
```


Simply add the setup-dlang action to your GitHub Actions workflow to automatically download and install a D compiler and package manager bundled with the compiler or separately downloaded. The action will automatically add the D binaries to the `PATH` environment variable and set the `DC` and `DMD` environment variables to point to the selected compiler and to the dmd wrapper (`gdmd`, `ldmd2`, or `dmd`) of the compiler respectively.
Note, this behavior has been slightly adjusted in v2.
For more details check the changes below.

## Input to this action

Examples:
```yml
- uses: dlang-community/setup-dlang@v2
  with:
    compiler: dmd^3
    dub: 1.37.0
```

```yml
- uses: dlang-community/setup-dlang@v2
  with:
    compiler: gdc-12
    # dub doesn't come with gdc
    dub: latest
    # Install gdmd from https://github.com/D-Programming-GDC/gdmd/blob/0a64b92ec5ad1177988496df4f3ca47c47580501/dmd-script
    # instead of the master branch
    gdmd_sha: '0a64b92ec5ad1177988496df4f3ca47c47580501'
    # turn off gpg verification (only dmd archives currently undergo this verification)
    verify_sig: false
```

### compiler

The compiler field is used to specify which D compiler needs to be installed. It can be left empty, in which case the action picks `dmd` for x86_64 runners, or `ldc` for all the others.
All the ways it can be specified are:
- `dmd` - install the latest release of dmd on https://downloads.dlang.org/releases/2.x/
- `dmd-latest` - same as above
- `dmd-beta` - install the latest pre-release of dmd on https://downloads.dlang.org/pre-releases/2.x/.
  If this version is lower than what would be installed if `dmd-latest` would have be specified then that version is installed instead.
- `dmd-2.099.0` - install the version `2.099.0`.
  You can browse https://downloads.dlang.org/releases/2.x/ to find all available versions.
- `dmd-2.108.1-beta.1` - same as above, but installs a pre-release instead of a release.
  You can browse https://downloads.dlang.org/pre-releases/2.x/ to find all available versions.
- `dmd-2.107` - install the highest version that has the minor component `107`.
  Specifically this would install version `2.107.1`.
  This may require that the action receives a github api token (it receives one by default so you don't need to bother with it unless doing something exotic).
- `dmd-2.107b` - same as above but also take into account pre-releases.
  Note that this form only matters when specifying the latest minor version available.
  Example: if version `2.108.1` is not releases but `2.108.1-rc.1` and `2.108.0` are, then `2.108b` would install `2.108.1-rc.1` and `2.108` would install `2.108.0`.
  This may require that the action receives a github api token.
- `dmd^3` - install the version that is 3 versions before `dmd-latest`.
  This is useful if your project wants to guarantee support for a range of versions of dmd but you don't want to periodically go and update the version number.
  Example: if the latest released version is `2.109.0` then `dmd^3` would install `dmd-2.106`, the final version is computed as described above.
  This may require that the action receives a github api token.
- `dmd-master` - install the latest nightly build as it appears on https://github.com/dlang/dmd/releases/nightly

- `ldc` - install the latest release of ldc from https://github.com/ldc-developers/ldc/releases
- `ldc-latest` - same as above
- `ldc-beta` - install the latest pre-release of ldc from https://github.com/ldc-developers/ldc/releases
- `ldc-1.37.0` - install a specific version
- `ldc-1.35.0-beta1` - same as above.
  You can browse https://github.com/ldc-developers/ldc/releases for a list of all releases.
- `ldc-1.37` - same behavior as `dmd-2.107`, see above
- `ldc-1.37b` - see above
- `ldc^3` - see above
- `ldc-master` - install the latest CI artifacts from https://github.com/ldc-developers/ldc/releases/CI.
  This may requires a github api token.

- `gdc` - install the apt package `gdc` and the `gdmd` script
- `gdc-12` - install the apt package `gdc-12` and the `gdmd` script
  The available versions of gdc you can install are the versions available in the ubuntu repositories. For `ubuntu-22.04` (`ubuntu-latest` currently) those are `gdc-12`, `gdc-11`, and, `gdc` which corresponds to `gdc-11`. If in doubt check https://packages.ubuntu.com

Whatever compiler you specify you can expect that the environment variable `$DC` will be set to point to that compiler binary.
Additionally `$DMD` will point to the dmd wrapper of the aforementioned compiler if you require a consistent command line interface.
Currently absolute paths are used but you shouldn't depend on it.
The compiler bin folder is also added to `$PATH` so you can run programs like `rdmd` or `dub` without specifying full paths.
Less useful but the library directory of the compiler is also added to `$PATH` on windows and `LD_LIBRARY_PATH` on linux and macos.
The compilers are already configured to embed this path themselves so you really shouldn't have to consider this but know that it is set.

### dub

If you need a specific version of dub or if the D compiler doesn't come with one (`gdc`) you can explicitly install one.

You can specify this version as:
- `latest` - install the latest version from https://github.com/dlang/dub/releases.
  This may require an api token.
- `1.24.0` - install https://github.com/dlang/dub/releases/tag/v1.24.0

### gh_token

A github token used to perform queries to https://api.github.com.
Check the [compiler](#compiler) input for when this token is used.
Github [generates](https://docs.github.com/en/actions/security-guides/automatic-token-authentication) a token for each workflow run and this action will use that by default.

### gdmd_sha

The gdmd script is downloaded straight from the [upstream](https://github.com/D-Programming-GDC/gdmd) repository.
You can specify a custom commit sha or a branch name in case the default one is not appropriate for your use case.
Examples include `dc0ad9f739795f3ce5c69825efcd5d1d586bb013`, `master`, or the special value `latest`, which acts similarly to `master`.

Usage of `latest` instead of `master` is preferred for portability reasons.
Take as an example that upstream may rename the development branch to `main` or `trunk` in which case the old name `master` will not work anymore.

The default value for this input is `latest` and it is required when using GDC.

### verify_sig

Use this boolean to disable gpg verification of downloaded artifacts. Currently, only dmd releases from https://download.dlang.org have a signature file.

The default value is `true`.

## Compiler support

### DMD

All DMD versions of releases and pre-releases since 2.065.0 on https://downloads.dlang.org/releases/2.x/ and https://downloads.dlang.org/pre-releases/2.x/ are supported.

DMD releases come with some extra tools like `rdmd` and `dub`. You are free to use them at your leisure.

### LDC

All releases on https://github.com/ldc-developers/ldc/releases are available.
Arm64 macos support in ldc begins with [v1.25.0](https://github.com/ldc-developers/ldc/releases/tag/v1.25.0).
Like dmd, ldc releases come with programs like `rdmd` and `dub`.

### GDC

Gdc is currently only available on linux.
The exact versions available are those in the ubuntu repos.
Note that gdc won't come by default with any extra programs like `rdmd` or `dub` so you would need to install them separately or install another compiler that comes with them.
You can do that with:

```yml
- uses: dlang-community/setup-dlang@v2
  name: Install dub and tools
  with:
    compiler: dmd

- uses: dlang-community/setup-dlang@v2
  name: Install D compiler
  with:
    compiler: gdc-12

  # Now you have dub, rdmd and gdc-12 in $PATH and $DC point to gdc-12
```

## DUB support

[dub](https://github.com/dlang/dub) is installed alongside the selected compiler for any versions of dmd and ldc higher than v2.072.0 (2016-10-31).

If the `dub` parameter is provided to the action, that version will be the one installed instead.

Note that DUB versions prior to v1.13.0 (DMD version v2.084.0, released 2019-01-02) do not support HTTP2,
meaning they will not work for fetching packages.
Additionally, some tags of dub (`v1.29.1` - `v1.36.0`) don't have releases so you won't be able to install them (https://github.com/dlang-community/setup-dlang/issues/64)

## Changes from v1

You can now specify `gdc` or `gdc-<version>` as inputs to this action, with the caveat that they only work on Linux runners.

Introduces the `DMD` variable which will point to the dmd wrapper of the selected compiler.
For example if you install `ldc-1.37.0` then `DC` will point to `<extracted_path>/ldc2` and `DMD` will point to `<extracted_path>/ldmd2`
This variable is setup for all compilers, automatically.

The most breaking change is the `$DC` environment variable becoming an absolute path instead of only the filename.
Depending on how it is used in scripts care must be taken to properly quote it especially on windows to avoid the `\` character being lost.

DMD versions prior to `dmd-2.072` will no longer install dub automatically.
If you need dub with these versions just specify it as an argument to the action.

When specifying `dmd-beta` the action may install `dmd-latest` if it determines that it has a more recent version.
Example, if the latest DMD beta is `2.098.1_rc1` and the latest DMD release is `2.099.0` then `dmd-beta` will now resolve to `2.099.0` instead of `2.098.1_rc1`.

The minimum available version of dmd has been raised to `2.065.0`.

`dmd` is now allowed on `macos-latest` (arm64).
It should work even if it's a x86_64 binary thanks to the Rosetta compatibility layer.

Use arm64 binaries for dub on macos, when applicable.
Dub started publishing macos binaries since version [1.38.1](https://github.com/dlang/dub/releases/tag/v1.38.1)

Updated a lot of dependencies, changed the output target to es2022 from es2017.
This means that one no longer needs to set `NODE_OPTIONS=--openssl-legacy-provider` when building.

Added unittests.
To run them use `npm test`.

Added the `verify_sig` option. It can be used to disable the gpg verification of the downloaded dmd archives. The option is meant to be used in edge-case scenarios when the [d-keyring](https://github.com/dlang/dlang.org/blob/master/d-keyring.gpg) is not updated alongside the dmd releases (#87). Requested in #90.
