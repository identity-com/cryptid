import { AccountMeta, PublicKey } from '@solana/web3.js';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';

export class TransactionAccountMeta extends Assignable<
  TransactionAccountMeta,
  'key' | 'meta'
> {
  key!: PublicKey;
  meta!: number;

  constructor(props: { key: PublicKey, meta: number}) {
    super(props);
  }

  static fromAccountMeta(meta: AccountMeta): TransactionAccountMeta {
    return new TransactionAccountMeta({
      key: meta.pubkey,
      meta:
        (meta.isSigner ? IS_SIGNER : 0) || (meta.isWritable ? IS_WRITABLE : 0),
    });
  }
}

export const IS_SIGNER = 1 << 0;
export const IS_WRITABLE = 1 << 1;

add_struct_to_schema(TransactionAccountMeta, { key: PublicKey, meta: 'u8' });
