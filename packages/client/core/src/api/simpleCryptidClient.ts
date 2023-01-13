import { CryptidClient, CryptidOptions } from "./cryptidClient";
import { ControlledCryptidClient } from "./controlledCryptidClient";
import { AbstractCryptidClient } from "./abstractCryptidClient";
import { Wallet } from "../types/crypto";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";
import { UnauthorizedCryptidClient } from "./unauthorizedCryptidClient";

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

  controlWith(controllerDid: string): CryptidClient {
    return new ControlledCryptidClient(controllerDid, this);
  }

  unauthorized(): CryptidClient {
    return new UnauthorizedCryptidClient(
      this.details,
      this.wallet,
      this.options
    );
  }
}
