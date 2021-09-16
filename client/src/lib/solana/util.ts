import {didToPublicKey} from "../util";
import {PublicKey} from "@solana/web3.js";
import {DOA_PROGRAM_ID} from "../constants";

const DOA_NONCE = 'cryptid_doa';

// TODO @brett
export const deriveDefaultDOA = async (did: string) => {
  const didKey = didToPublicKey(did);
  const publicKeyNonce = await PublicKey.findProgramAddress(
    [
      didKey.toBuffer(),
      Buffer.from(DOA_NONCE, 'utf8'),
    ],
    DOA_PROGRAM_ID
  );
  return publicKeyNonce[0];
}
