import AssignablePublicKey from './AssignablePublicKey';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';

export default class SigningKeyData extends Assignable<SigningKeyData> {
  key!: AssignablePublicKey;
  extraKeys!: AssignablePublicKey[];
}

add_struct_to_schema(SigningKeyData, {
  key: AssignablePublicKey,
  extraKeys: [AssignablePublicKey],
});
