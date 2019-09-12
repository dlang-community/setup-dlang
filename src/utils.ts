import * as httpm from 'typed-rest-client/HttpClient';

export async function body_as_text (url: string): Promise<string> {
    let client = new httpm.HttpClient("mihails-strasuns/setup-dlang");
    return (await (await client.get(url)).readBody()).trim();
}