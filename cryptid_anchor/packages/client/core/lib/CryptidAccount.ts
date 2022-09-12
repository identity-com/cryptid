import {PublicKey} from "@solana/web3.js";
import {deriveCryptidAccountAddress} from "@identity.com/cryptid-program-tests/util/cryptid";
import {didToPDA} from "./did";

export class CryptidAccount {
    constructor(
        // The address of the cryptid account PDA on chain
        readonly address: PublicKey,
        // The bump seed used to derive the cryptid account PDA
        readonly bump: number,
        // The index of the DID's cryptid account
        readonly index: number,
        // The DID of the cryptid account
        readonly ownerDID: string,
        // The on-chain PDA of the DID (may be generative)
        readonly didAccount: PublicKey
    ) {}

    static async build(did: string, index: number = 0) {
        const didAccount = await didToPDA(did);
        const [address, bump] = await deriveCryptidAccountAddress(didAccount, index);

        return new CryptidAccount(address, bump, index, did, didAccount);
    }
}