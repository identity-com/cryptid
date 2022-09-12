import { CryptidOptions } from './cryptid';
import { ControlledCryptid } from './controlledCryptid';
import { AbstractCryptid } from './abstractCryptid';
import {Wallet} from "../types/crypto";

export class SimpleCryptid extends AbstractCryptid {
  constructor(did: string, private _wallet: Wallet, options: CryptidOptions) {
    super(did, options);
  }

  get wallet(): Wallet {
    return this._wallet;
  }

  as(controlledDid: string): ControlledCryptid {
    return new ControlledCryptid(controlledDid, this, this.options);
  }
}
