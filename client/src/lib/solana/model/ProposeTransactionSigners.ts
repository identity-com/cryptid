import {add_struct_to_schema, Assignable, AssignableI64} from '../solanaBorsh';

export class ProposeTransactionSigners extends Assignable<ProposeTransactionSigners> {
  signerExtras!: number;
  expireTime!: AssignableI64;

  constructor(props: { signerExtras: number; expireTime: AssignableI64 }) {
    super(props);
  }
}

add_struct_to_schema(ProposeTransactionSigners, {
  signerExtras: 'u8',
  expireTime: AssignableI64,
});
