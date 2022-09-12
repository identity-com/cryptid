import {getTokenAccounts, TokenDetails} from '../../service/cryptid'
import {PublicKey} from '@solana/web3.js'
import Base from '../base'

export default class TokenBalance extends Base {
  static description = 'show an SPL Token balance';

  static args = [
    {
      name: 'mint',
      description: 'The SPL-Token mint(base58)',
      required: true,
      parse: async (address: string): Promise<PublicKey> =>
        new PublicKey(address),
    },
  ];

  static flags = Base.flags;

  async run(): Promise<void> {
    const {args} = await this.parse(TokenBalance)

    const accounts = await getTokenAccounts(this.cryptid, this.cryptidConfig)

    const token = accounts.find(
      (token: TokenDetails) => token.mint.toString() === args.mint.toString(),
    )

    this.log(token ? token.balance : '0')
  }
}
