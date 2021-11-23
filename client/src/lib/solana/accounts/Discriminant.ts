import { add_struct_to_schema, Assignable } from '../solanaBorsh';

//TODO: Support larger than 127 discriminants
export default class Discriminant extends Assignable<Discriminant> {
  value!: number;

  constructor(props: { value: number }) {
    super(props);
  }
}

add_struct_to_schema(Discriminant, {
  value: 'u8',
});
