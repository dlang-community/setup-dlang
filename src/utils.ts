import * as tc from '@actions/tool-cache'
import * as httpm from 'typed-rest-client/HttpClient';
import { BearerCredentialHandler } from 'typed-rest-client/Handlers';
import { IHttpClientResponse } from 'typed-rest-client/Interfaces';

export async function retry<Result>(action: () => Promise<Result>): Promise<Result> {
    const timeouts = [5000, 10000, 20000];
    let lastError;

    for (let timeout of timeouts) {
        try {
            return await action()
        } catch (e) {
            lastError = e
            await new Promise(resolve => setTimeout(resolve, timeout))
        }
    }
    throw lastError
}

/// Like tc.downloadTool but always retries
export async function downloadTool(url: string, dest?: string): Promise<string> {
    return await retry(async () => tc.downloadTool(url, dest))
}

export async function get_response(url: string, token: string = '') {
    const bearer = token ? [ new BearerCredentialHandler(token) ] : undefined;
    return await retry(async () => {
        const client = new httpm.HttpClient("dlang-community/setup-dlang", bearer);
        const res = await client.get(url);
        // redirects are followed by the library, check for error codes here
        const statusCode = res?.message?.statusCode ?? 500;
        if (statusCode >= 400)
            throw new Error(`failed requesting ${url}\n${res?.message.statusCode} ${res?.message.statusMessage}:\n${res?.message.rawHeaders.join('\n')}\n\n${(await res?.readBody())?.trim()}`)
        return res
    })
}

export async function body_as_text(url: string, token: string = ''): Promise<string> {
    let response = await get_response(url, token)
    let body = await response.readBody()
    return body.trim()
}

export async function extract(format: string, archive: string, into?: string) {
    if (format.endsWith(".7z"))
        return await tc.extract7z(archive, into);
    else if (format.endsWith(".zip"))
        return await tc.extractZip(archive, into);
    else if (/\.tar(\.\w+)?$/.test(format))
        return await tc.extractTar(archive, into, 'x');

    throw new Error("unsupported archive format: " + format);
}

/** Interface for a github tag as exposed by the rest api */
export interface IGithubTag {
    name: string
    zipball_url: string
    tarball_url: string
    commit: {
	sha: string
	urm: string
    }
    node_id: string
}

/** Visit all the tags of a repository

    @param url - The github api url, for example:
    https://api.github.com/repository/dlang/dmd

    @param tagVisitor - A function that takes in an IGithubTag and
    returns true to keep visiting or false to stop

    @returns the number of pages fully visited. This can be used to
    remember where the query left of if fetching tags repeatedly.
 */
export async function visitTags(url: string, token: string, tagVisitor: (tag: IGithubTag) => boolean): Promise<number> {
    // "inspired" by https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api?apiVersion=2022-11-28#example-creating-a-pagination-method
    let response = await get_response(url, token)
    const nextPattern = /(?<=<)([\S]*)(?=>; rel="Next")/i;
    let pagesRemaining = true;
    let pagesVisited = 0;

    while (pagesRemaining) {
	const response = await get_response(url, token);

	const parsedData = JSON.parse(await response.readBody())
	let i: number;
	for (i = 0; i < parsedData.length; ++ i) {
	    if (!tagVisitor(parsedData[i])) {
		// Finish early
		break
	    }
	}
	if (i != parsedData.length) {
	    break
	}
	++ pagesVisited

	const linkHeader = <string>response.message.rawHeaders[response.message.rawHeaders.indexOf('Link') + 1]

	pagesRemaining = linkHeader.length != 0 && linkHeader.includes(`rel=\"next\"`);

	if (pagesRemaining) {
	    url = linkHeader.match(nextPattern)![0]
	}
    }

    return pagesVisited
}
