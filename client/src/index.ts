import { publicKeyToDid } from './lib/util'

import { Builder } from './api/Builder';
export { Cryptid } from './api/Cryptid';

export const build = Builder.build

export const util = {
  publicKeyToDid
}
