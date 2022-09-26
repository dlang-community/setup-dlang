import * as httpm from 'typed-rest-client/HttpClient';
import { BearerCredentialHandler } from 'typed-rest-client/Handlers';
import { IHttpClientResponse } from 'typed-rest-client/Interfaces';

export async function body_as_text(url: string, token: string = ''): Promise<string> {
    const bearer = token ? [ new BearerCredentialHandler(token) ] : undefined;
    const timeouts = [5000, 10000, 20000];
    let retry = 0;
    let res: IHttpClientResponse | undefined = undefined;
    for (; retry < 3; retry++) {
        const client = new httpm.HttpClient("dlang-community/setup-dlang", bearer);
        res = await client.get(url);
        // redirects are followed by the library, check for error codes here
        const statusCode = res?.message?.statusCode ?? 500;
        if (statusCode >= 400) {
            await new Promise(resolve => setTimeout(resolve, timeouts[retry]));
            continue;
        }
        return (await res.readBody()).trim();
    }
    throw new Error(`failed requesting ${url} - aborting after ${retry} tries\n${res?.message.statusCode} ${res?.message.statusMessage}:\n${res?.message.rawHeaders.join('\n')}\n\n${(await res?.readBody())?.trim()}`);
}
