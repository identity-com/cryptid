import Base from './base'

export default class Address extends Base {
  static description = "Show the cryptid account's address";

  static flags = Base.flags;

  async run(): Promise<void> {
    const address = await this.cryptid.address()

    this.log(address.toBase58())
  }
}
