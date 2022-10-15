type SemVer = [number, number, number, (string | number)[]];

export function parseSimpleSemver(a: string): SemVer {
    if (a.startsWith("v")) a = a.substring(1);

    // delete build meta
    const plus = a.indexOf('+');
    if (plus != -1) a = a.substring(0, plus);

    // pre-release is important for sorting
    const hyphen = a.indexOf('-');
    let preRelease: (string | number)[] = [];
    if (hyphen != -1) {
        let part = a.substring(hyphen + 1);
        a = a.substring(0, hyphen);

        preRelease = part.split('.');
        for (let i = 0; i < preRelease.length; i++) {
            const n = parseInt(<string>preRelease[i]);
            if (isFinite(n))
                preRelease[i] = n;
        }
    }

    const parts = a.split('.');
    if (parts.length != 3)
        throw new Error("Version specification '" + a + "' not parsable by simple semver rules");
    return [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), preRelease];
}

export function cmpSemver(a: SemVer, b: SemVer): number {
    for (let i = 0; i < 3; i++) {
        if (a[i] < b[i]) return -1;
        else if (a[i] > b[i]) return 1;
    }

    // pre-release on a but not on b
    if (a[3].length > 0 && b[3].length == 0) return -1;
    // pre-release on b but not on a
    else if (a[3].length == 0 && b[3].length > 0) return 1;

    const min = Math.min(a[3].length, b[3].length);
    for (let i = 0; i < min; i++) {
        if (a[3][i] < b[3][i])
            return -1;
        else if (a[3][i] > b[3][i])
            return 1;
    }

    if (a[3].length == b[3].length) return 0;
    else if (a[3].length < b[3].length) return -1;
    else return 1;
}
