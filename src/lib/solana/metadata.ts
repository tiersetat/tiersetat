export type OnchainMetadata = { name: string; symbol: string; uri: string };

/**
 * Décode le début d'un compte Metaplex Token Metadata :
 * key (1) | update_authority (32) | mint (32) | name | symbol | uri (chaînes borsh u32 + octets, complétées par des \0).
 */
export function decodeMetaplexMetadata(data: Uint8Array): OnchainMetadata {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 1 + 32 + 32;
  const readString = () => {
    if (offset + 4 > data.length) throw new Error("Métadonnées tronquées");
    const len = view.getUint32(offset, true);
    offset += 4;
    if (offset + len > data.length) throw new Error("Métadonnées tronquées");
    const value = new TextDecoder().decode(data.subarray(offset, offset + len)).replace(/\0+$/g, "");
    offset += len;
    return value.trim();
  };
  const name = readString();
  const symbol = readString();
  const uri = readString();
  return { name, symbol, uri };
}
