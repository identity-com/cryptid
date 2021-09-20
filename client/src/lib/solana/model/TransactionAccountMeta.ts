import { AccountMeta, PublicKey } from '@solana/web3.js';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';

export class TransactionAccountMeta extends Assignable<
  TransactionAccountMeta,
  'key' | 'meta'
> {
  key: PublicKey;
  meta: number;

  constructor(key: PublicKey, is_signer: boolean, is_writable: boolean) {
    super();
    this.key = key;
    this.meta = (is_signer ? IS_SIGNER : 0) || (is_writable ? IS_WRITABLE : 0);
  }

  static fromAccountMeta(meta: AccountMeta): TransactionAccountMeta{
    return new TransactionAccountMeta(
      meta.pubkey,
      meta.isSigner,
      meta.isWritable
    );
  }
}

export const IS_SIGNER = 1 << 0;
export const IS_WRITABLE = 1 << 1;

add_struct_to_schema(TransactionAccountMeta, { key: PublicKey, meta: 'u8' });
