import { bytesToBase58 } from '../../util';
import { PublicKey } from '@solana/web3.js';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';

export default class AssignablePublicKey extends Assignable<AssignablePublicKey> {
  // The public key bytes
  public bytes!: number[];

  toPublicKey(): PublicKey {
    return new PublicKey(this.bytes);
  }

  toString(): string {
    return bytesToBase58(Uint8Array.from(this.bytes));
  }

  static parse(pubkey: string): AssignablePublicKey {
    return AssignablePublicKey.fromPublicKey(new PublicKey(pubkey));
  }

  static fromPublicKey(publicKey: PublicKey): AssignablePublicKey {
    return new AssignablePublicKey({
      bytes: Array.from(publicKey.toBuffer()),
    });
  }

  static empty(): AssignablePublicKey {
    const bytes = new Array(32);
    bytes.fill(0);
    return new AssignablePublicKey({ bytes });
  }
}

add_struct_to_schema(AssignablePublicKey, {
  bytes: ['u8', 32],
});
