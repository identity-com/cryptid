import AssignablePublicKey from '../model/AssignablePublicKey';
import InstructionData from '../model/InstructionData';
import SigningKeyData from '../model/SigningKeyData';
import {
  add_struct_to_schema,
  Assignable,
  AssignableI64,
} from '../solanaBorsh';
import TransactionState from '../model/TransactionState';
import Discriminant from './Discriminant';

export default class TransactionAccount extends Assignable<TransactionAccount> {
  discriminant!: Discriminant;
  cryptidAccount!: AssignablePublicKey;
  accounts!: AssignablePublicKey[];
  transactionInstructions!: InstructionData[];
  signers!: TransactionAccountSigner[];
  state!: TransactionState;
  settingsSequence!: number;
}

export class TransactionAccountSigner extends Assignable<TransactionAccountSigner> {
  signerData!: SigningKeyData;
  expireTime!: AssignableI64;
}

add_struct_to_schema(TransactionAccount, {
  discriminant: Discriminant,
  cryptidAccount: AssignablePublicKey,
  accounts: [AssignablePublicKey],
  transactionInstructions: [InstructionData],
  signers: [TransactionAccountSigner],
  state: TransactionState,
  settingsSequence: 'u16',
});
add_struct_to_schema(TransactionAccountSigner, {
  signerData: SigningKeyData,
  expireTime: AssignableI64,
});
