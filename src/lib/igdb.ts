import { pb } from "./pocketbase";
import { Collections } from "./pocketbase-types";

const storage_ns = "IGDB_CACHE";

const memo: {
  secrets?: { IGDBClientID: string; IGDBClientSecret: string };
  token?: string;
} = {
  secrets: undefined,
  token: undefined,
};

async function getSecrets(): Promise<
  { IGDBClientID: string; IGDBClientSecret: string }
> {
  if (memo.secrets) return memo.secrets;
  const secrets_response = await pb.collection(Collections.Secrets)
    .getFirstListItem('name="igdb_secrets"', {
      $autoCancel: false,
    });
  const secrets = secrets_response.content as {
    IGDBClientID: string;
    IGDBClientSecret: string;
  };
  memo.secrets = secrets;
  return secrets;
}

async function getToken() {
  if (memo.token) return memo.token;
  const secrets = await getSecrets();
  const params = new URLSearchParams({
    client_id: secrets.IGDBClientID,
    client_secret: secrets.IGDBClientSecret,
    grant_type: "client_credentials",
  });
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    method: "POST",
  });
  const auth: { access_token: string; expires_in: number; token_type: string } =
    await res.json();
  memo.token = auth.access_token;
  setTimeout(() => {
    memo.token = undefined;
  }, auth.expires_in - 1000);
  return auth.access_token;
}

export async function searchGames(query: string): Promise<Array<{ id: number; name: string; url: string; cover?: number }>> {
    const [token, secrets] = await Promise.all([getToken(), getSecrets()]);
    const headers = {
        "Accept": "application/json",
        "Client-ID": secrets.IGDBClientID,
        "Authorization": `Bearer ${token}`,
    };
    const safe = query.replace(/"/g, "");
    const res = await fetch("/igdb/games", {
        headers,
        body: `fields name, url, cover; search "${safe}"; limit 10;`,
        method: "POST",
    });
    return res.json();
}

export async function getCoverUrlFromCoverId(coverId: number): Promise<string | null> {
    const cacheKey = `${storage_ns}_cover_id_${coverId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    const [token, secrets] = await Promise.all([getToken(), getSecrets()]);
    const headers = {
        "Accept": "application/json",
        "Client-ID": secrets.IGDBClientID,
        "Authorization": `Bearer ${token}`,
    };
    const res = await fetch("/igdb/covers", {
        headers,
        body: `fields image_id; where id = ${coverId}; limit 1;`,
        method: "POST",
    });
    const data = await res.json();
    if (!data[0]?.image_id) return null;
    const url = `https://images.igdb.com/igdb/image/upload/t_cover_small/${data[0].image_id}.png`;
    localStorage.setItem(cacheKey, url);
    return url;
}

export async function getCoverUrl(game_url: string): Promise<string> {
    
  if (localStorage.getItem(`${storage_ns}_${game_url}`)) {
    return localStorage.getItem(`${storage_ns}_${game_url}`)!;
  }

  const [token, secrets] = await Promise.all([getToken(), getSecrets()]);
  const headers = {
    "Accept": "application/json",
    "Client-ID": secrets.IGDBClientID,
    "Authorization": `Bearer ${token}`,
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
  const url =
    `https://images.igdb.com/igdb/image/upload/t_cover_big/${image_id}.png`;
  localStorage.setItem(`${storage_ns}_${game_url}`, url);
  return url;
}
