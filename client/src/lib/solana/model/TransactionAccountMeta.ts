import { AccountMeta, PublicKey } from '@solana/web3.js';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';
import { randomInt } from 'crypto';

export class TransactionAccountMeta extends Assignable<TransactionAccountMeta> {
  key!: number;
  meta!: number;

  constructor(props: { key: number; meta: number }) {
    super(props);
  }

  static random(props?: {
    accountsNum?: number;
    isSigner?: boolean;
    isWritable?: boolean;
  }): TransactionAccountMeta {
    return TransactionAccountMeta.fromIndexAndMeta(
      randomInt(0, props && props.accountsNum ? props.accountsNum : 10),
      props && props.isSigner ? props.isSigner : randomInt(0, 2) === 1,
      props && props.isWritable ? props.isWritable : randomInt(0, 2) === 1
    );
  }

  static fromIndexAndMeta(
    key: number,
    isSigner: boolean,
    isWriteable: boolean
  ): TransactionAccountMeta {
    return new TransactionAccountMeta({
      key,
      meta: (isSigner ? IS_SIGNER : 0) | (isWriteable ? IS_WRITABLE : 0),
    });
  }

  static fromAccountMeta(
    meta: AccountMeta,
    account_array: PublicKey[]
  ): TransactionAccountMeta {
    const keyIndex = account_array.findIndex((value) =>
      value.equals(meta.pubkey)
    );
    if (keyIndex < 0) {
      throw new Error(`Can't find key ${meta.pubkey.toBase58()}`);
    }
    return new TransactionAccountMeta({
      key: keyIndex,
      meta:
        (meta.isSigner ? IS_SIGNER : 0) | (meta.isWritable ? IS_WRITABLE : 0),
    });
  }
}

export const IS_SIGNER = 1 << 0;
export const IS_WRITABLE = 1 << 1;

add_struct_to_schema(TransactionAccountMeta, {
  key: 'u8',
  meta: 'u8',
});
