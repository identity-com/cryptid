import { AssignablePublicKey } from './AssignablePublicKey';
import { add_struct_to_schema, Assignable } from '../solanaBorsh';

export default class SigningKeyData extends Assignable<SigningKeyData> {
  key!: AssignablePublicKey;
  extraKeys!: AssignablePublicKey[];

  constructor(props: {
    key: AssignablePublicKey;
    extraKeys: AssignablePublicKey[];
  }) {
    super(props);
  }
}

add_struct_to_schema(SigningKeyData, {
  key: AssignablePublicKey,
  extraKeys: [AssignablePublicKey],
});
