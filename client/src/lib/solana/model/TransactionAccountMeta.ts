import { AccountMeta } from '@solana/web3.js';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';
import {AssignablePublicKey} from "./AssignablePublicKey";

export class TransactionAccountMeta extends Assignable<TransactionAccountMeta> {
  key!: AssignablePublicKey;
  meta!: number;

  constructor(props: { key: AssignablePublicKey, meta: number}) {
    super(props);
  }

  static fromAccountMeta(meta: AccountMeta): TransactionAccountMeta {
    return new TransactionAccountMeta({
      key: AssignablePublicKey.fromPublicKey(meta.pubkey),
      meta:
        (meta.isSigner ? IS_SIGNER : 0) || (meta.isWritable ? IS_WRITABLE : 0),
    });
  }
}

export const IS_SIGNER = 1 << 0;
export const IS_WRITABLE = 1 << 1;

add_struct_to_schema(TransactionAccountMeta, { key: AssignablePublicKey, meta: 'u8' });
