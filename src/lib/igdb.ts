import { currentUser, pb } from "./pocketbase";
import { Collections } from "./pocketbase-types";

const storage_ns = "IGDB_CACHE"

const memo = {
    secrets: null,
    token: null
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function getSecrets(): Promise<{ IGDBClientID: string, IGDBClientSecret: string }> {
    if (!currentUser) throw Error("No user!");
    if (!!memo.secrets) return memo.secrets;

    // At this point, we know that the user is *one of us* and, thus, we are not afraid of sharing the secrets.
    // Don't try this at home!
    const secrets_response = await pb.collection(Collections.Secrets)
        .getFirstListItem("name=\"igdb_secrets\"", {
            $autoCancel: false
        });
    const secrets = secrets_response.content as { IGDBClientID: string, IGDBClientSecret: string };
    memo.secrets = secrets;
    return secrets;
}

async function getToken() {
    if (!currentUser) throw Error("No user!");
    if (!!memo.token) return memo.token;
    const secrets = await getSecrets();
    const res = await fetch(
        `/token?client_id=${secrets.IGDBClientID}` +
        `&client_secret=${secrets.IGDBClientSecret}&grant_type=client_credentials`, {
            headers: {
                "Accept": "application/json"
            },
            method: "POST"
        }
    );
    const auth: { access_token: string, expires_in: number, token_type: string } = await res.json();
    memo.token = auth.access_token;
    setTimeout(() => {
        memo.token = null;
    }, auth.expires_in - 1000);
    return auth.access_token;
}

export async function getCoverUrl(game_url: string): Promise<string> {
    if (!!localStorage.getItem(`${storage_ns}_${game_url}`)) {
        return localStorage.getItem(`${storage_ns}_${game_url}`);
    }

    const secrets = await getSecrets();
    const token = await getToken();
    const headers = {
        "Accept": "application/json",
        "Client-ID": secrets.IGDBClientID,
        "Authorization": `Bearer ${token}`
    };
    // Remember to write the header like: `Authorization: 'Bearer ${token}'`
    const res = await fetch("/igdb/games", {
        headers,
        body: `fields cover; where url = "${game_url}"; limit 1;`,
        method: "POST",
    });
    const content = await res.json();
    const cover_id = content[0]["cover"]; ///290680
    const res2 = await fetch("/igdb/covers", {
        headers,
        body: `fields *; where id = ${cover_id}; limit 1;`,
        method: "POST",
    });

    const cover = (await res2.json())[0];
    const image_id = cover["image_id"];
    const url = `https://images.igdb.com/igdb/image/upload/t_cover_big/${image_id}.png`;
    localStorage.setItem(`${storage_ns}_${game_url}`, url);
    return url
}

export async function getGame(game_url: string) {

}
