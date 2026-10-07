import "server-only";
import { MissingEnvError } from "@/lib/env";

const V3_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files";
const LEGACY_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const LEGACY_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

function pinataEnv() {
  const jwt = process.env.PINATA_JWT;
  const gateway = process.env.PINATA_GATEWAY;
  if (!jwt) throw new MissingEnvError("PINATA_JWT");
  if (!gateway) throw new MissingEnvError("PINATA_GATEWAY");
  return { jwt, gateway };
}

export function gatewayUrl(cid: string): string {
  return `https://${pinataEnv().gateway}/ipfs/${cid}`;
}

/** Préfixe des URI acceptées à l'indexation : uniquement nos propres fichiers IPFS. */
export function gatewayPrefix(): string {
  return `https://${pinataEnv().gateway}/ipfs/`;
}

async function readError(res: Response) {
  return `Upload IPFS refusé (${res.status}) : ${(await res.text()).slice(0, 200)}`;
}

/**
 * Upload public sur IPFS via Pinata. Renvoie le CID.
 * Essaie l'API v3 (clés « Files: Write » / Admin), puis l'API classique
 * (clés limitées à pinFileToIPFS + pinJSONToIPFS, les plus restreintes).
 */
export async function pinFile(file: Blob, name: string): Promise<string> {
  const { jwt } = pinataEnv();
  const auth = { Authorization: `Bearer ${jwt}` };

  const v3 = new FormData();
  v3.append("file", file, name);
  v3.append("network", "public");
  v3.append("name", name);
  const res = await fetch(V3_UPLOAD_URL, { method: "POST", headers: auth, body: v3 });
  if (res.ok) {
    const json = (await res.json()) as { data?: { cid?: string } };
    if (json.data?.cid) return json.data.cid;
    throw new Error("Réponse Pinata sans CID");
  }
  if (res.status !== 401 && res.status !== 403) throw new Error(await readError(res));

  const legacy = new FormData();
  legacy.append("file", file, name);
  legacy.append("pinataMetadata", JSON.stringify({ name }));
  const res2 = await fetch(LEGACY_FILE_URL, { method: "POST", headers: auth, body: legacy });
  if (!res2.ok) throw new Error(await readError(res2));
  const json2 = (await res2.json()) as { IpfsHash?: string };
  if (!json2.IpfsHash) throw new Error("Réponse Pinata sans CID");
  return json2.IpfsHash;
}

export async function pinJson(data: unknown, name: string): Promise<string> {
  const { jwt } = pinataEnv();
  const res = await fetch(LEGACY_JSON_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pinataContent: data, pinataMetadata: { name } }),
  });
  if (res.ok) {
    const json = (await res.json()) as { IpfsHash?: string };
    if (json.IpfsHash) return json.IpfsHash;
  } else if (res.status !== 401 && res.status !== 403) {
    throw new Error(await readError(res));
  }
  // Clé v3 sans scopes classiques : on passe par l'upload de fichier
  return pinFile(new Blob([JSON.stringify(data)], { type: "application/json" }), name);
}
