import { CryptidOptions } from "./cryptidClient";
import { ControlledCryptidClient } from "./controlledCryptidClient";
import { AbstractCryptidClient } from "./abstractCryptidClient";
import { Wallet } from "../types/crypto";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";

export class SimpleCryptidClient extends AbstractCryptidClient {
  constructor(
    details: CryptidAccountDetails,
    private _wallet: Wallet,
    options: CryptidOptions
  ) {
    super(details, options);
  }

  get wallet(): Wallet {
    return this._wallet;
  }

  as(controlledDid: string): ControlledCryptidClient {
    return new ControlledCryptidClient(controlledDid, this, this.options);
  }
}
