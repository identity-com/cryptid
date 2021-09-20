import {add_struct_to_schema, Assignable, SCHEMA} from '../solanaBorsh';
import { PublicKey } from '@solana/web3.js';

export class DoaData extends Assignable<
  DoaData,
  'did' | 'did_program' | 'signer_nonce' | 'key_threshold' | 'settings_sequence'
> {
  did: PublicKey;
  did_program: PublicKey;
  signer_nonce: number;
  key_threshold: number;
  settings_sequence: number;

  constructor(
    did: PublicKey,
    did_program: PublicKey,
    signer_nonce: number,
    key_threshold: number,
    settings_sequence: number
  ) {
    super();
    this.did = did;
    this.did_program = did_program;
    this.signer_nonce = signer_nonce;
    this.key_threshold = key_threshold;
    this.settings_sequence = settings_sequence;
  }
}

add_struct_to_schema(DoaData, {
  did: PublicKey,
  did_program: PublicKey,
  signer_nonce: 'u8',
  key_threshold: 'u8',
  settings_sequence: 'u16',
});
SCHEMA.set(DoaData, {
  kind: 'struct',
  fields: [
    ['did', PublicKey],
    ['did_program', PublicKey],
    ['signer_nonce', 'u8'],
    ['key_threshold', 'u8'],
    ['settings_sequence', 'u16'],
  ],
});
