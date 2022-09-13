import { Cryptid, CryptidOptions } from './cryptid';
import { AbstractCryptid } from './abstractCryptid';
import {Wallet} from "../types/crypto";

export class ControlledCryptid extends AbstractCryptid {
  /**
   * Create a controlled cryptid account. Controlled by the controllerCryptid
   *
   * A controlled cryptid has no key - the key is provided by the controller
   * @param controlledDid
   * @param controllerCryptid
   * @param options
   */
  constructor(
    controlledDid: string,
    private controllerCryptid: Cryptid,
    options: CryptidOptions
  ) {
    super(controlledDid, options);
    // TODO discover and store controller chain
  }

  get wallet(): Wallet {
    return this.controllerCryptid.wallet;
  }

  as(controlledDid: string): ControlledCryptid {
    return new ControlledCryptid(controlledDid, this, this.options);
  }
}
