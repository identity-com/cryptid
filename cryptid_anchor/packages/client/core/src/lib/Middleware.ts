import {PublicKey} from "@solana/web3.js";

export class Middleware {
    constructor(readonly programId: PublicKey, readonly address: PublicKey) {}
}