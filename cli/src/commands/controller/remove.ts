import Base from "../base";

export default class RemoveController extends Base {
  static description = "Remove a controller from a cryptid account";

  static args = [{ name: "did" }];

  static flags = Base.flags;

  async run(): Promise<void> {
    const { args } = await this.parse(RemoveController);

    await this.cryptid.removeController(args.did);
    this.log("Removed");
  }
}
