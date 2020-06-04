import * as httpm from 'typed-rest-client/HttpClient';
import { BearerCredentialHandler } from 'typed-rest-client/Handlers';

export async function body_as_text(url: string, token: string = ''): Promise<string> {
    const bearer = token ? [ new BearerCredentialHandler(token) ] : undefined;
    let client = new httpm.HttpClient("dlang-community/setup-dlang", bearer);
    return (await (await client.get(url)).readBody()).trim();
}
