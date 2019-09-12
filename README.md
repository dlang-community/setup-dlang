## Usage Example

```yml
name: Test My D Project
on: [push, pull_request]

jobs:
    test:
        name: Test
        strategy:
            matrix:
                os: [ubuntu-latest, windows-latest, macOS-latest]
                dc: [dmd-2.088.0, ldc-1.17.0]
        runs-on: ${{ matrix.os }}
        steps:
            - uses: actions/checkout@master

            - name: Install D compiler
              uses: mihails-strasuns/setup-dlang@v0
              with:
                  compiler: ${{ matrix.dc }}

            - name: Run tests
              run: dub -q test
```
