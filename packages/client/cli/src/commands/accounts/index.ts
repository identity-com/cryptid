import Base from "../base";
import { listAccounts } from "../../service/cryptid";
import { CryptidAccountDetails } from "@identity.com/cryptid";

const detailsToString = (
  account: CryptidAccountDetails,
  index: number,
  active = false
) =>
  `${active ? "*" : ""}${index}: ${account.address} middlewares: ${
    account.middlewares.length
  }`;

export default class AccountsShow extends Base {
  static description = "Show Cryptid accounts";

  static args = [];

  static flags = Base.flags;

  static aliases = ["show"];

  async run(): Promise<void> {
    const accounts = await listAccounts(this.cryptid, this.cryptidConfig);
    const currentAccountIndex = this.cryptidConfig.index;

    if (accounts.length <= currentAccountIndex) {
      this.log("Incorrect account index set: " + currentAccountIndex);
      this.log("Accounts available:");
    }

    accounts.map((a, index) =>
      this.log(detailsToString(a, index, index === currentAccountIndex))
    );
  }
}
