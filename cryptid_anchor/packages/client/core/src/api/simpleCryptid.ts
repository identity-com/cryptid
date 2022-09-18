import { CryptidOptions } from './cryptid';
import { ControlledCryptid } from './controlledCryptid';
import { AbstractCryptid } from './abstractCryptid';
import {Wallet} from "../types/crypto";
import {CryptidAccountDetails} from "../lib/CryptidAccountDetails";

export class SimpleCryptid extends AbstractCryptid {
  constructor(details: CryptidAccountDetails, private _wallet: Wallet, options: CryptidOptions) {
    super(details, options);
  }

  get wallet(): Wallet {
    return this._wallet;
  }

  as(controlledDid: string): ControlledCryptid {
    return new ControlledCryptid(controlledDid, this, this.options);
  }
}
