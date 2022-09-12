import {getControllers} from '../../service/cryptid'
import Base from '../base'

export default class ShowController extends Base {
  static description = 'Show the controllers of a cryptid account';

  static args = [{name: 'did'}];

  static flags = Base.flags;

  async run(): Promise<void> {
    const controllers = await getControllers(this.cryptid)
    this.log(controllers.join('\n'))
  }
}
