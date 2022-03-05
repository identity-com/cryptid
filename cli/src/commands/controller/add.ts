import Base from "../base";

export default class AddController extends Base {
  static description = "Add a controller to a cryptid account";

  static args = [{ name: "did" }];

  static flags = Base.flags;

  async run(): Promise<void> {
    const { args } = await this.parse(AddController);

    await this.cryptid.addController(args.did);
    this.log("Added");
  }
}
