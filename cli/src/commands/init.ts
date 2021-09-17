import {Command, flags} from '@oclif/command'
import { Config as ConfigService } from '../service/config/'

export default class Init extends Command {
  static description = 'Initialise the cryptid library'

  static flags = {
    help: flags.help({char: 'h'}),
    overwrite: flags.boolean({char: 'o', description: 'Overwrite existing configuration', default: false }),
    path: flags.string({char: 'p', description: 'Configuration path', required: false }),
    key: flags.string({char: 'k', description: 'Path to a solana keypair', required: false })
  }

  static args = [{name: 'file'}]

  async run() {
    const {flags} = this.parse(Init)

    ConfigService.init(flags.overwrite, flags.path);
  }
}
