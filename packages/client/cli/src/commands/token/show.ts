import { getTokenAccounts, TokenDetails } from "../../service/cryptid";
import Base from "../base";

const prettyPrint = (token: TokenDetails): string =>
  `${token.mint}:\t${token.balance}`;

export default class TokenShow extends Base {
  static description = "show all SPL Token balances";

  static args = [];

  static flags = Base.flags;

  async run(): Promise<void> {
    const accounts = await getTokenAccounts(this.cryptid, this.cryptidConfig);

    this.log(accounts.map(prettyPrint).join("\n"));
  }
}
