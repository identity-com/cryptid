import { add_struct_to_schema, Assignable } from '../solanaBorsh';
import { PublicKey } from '@solana/web3.js';

export default class DoaData extends Assignable<DoaData> {
  did!: PublicKey;
  did_program!: PublicKey;
  signer_nonce!: number;
  key_threshold!: number;
  settings_sequence!: number;

  constructor(props: {
    did: PublicKey;
    did_program: PublicKey;
    signer_nonce: number;
    key_threshold: number;
    settings_sequence: number;
  }) {
    super(props);
  }
}

add_struct_to_schema(DoaData, {
  did: PublicKey,
  did_program: PublicKey,
  signer_nonce: 'u8',
  key_threshold: 'u8',
  settings_sequence: 'u16',
});
