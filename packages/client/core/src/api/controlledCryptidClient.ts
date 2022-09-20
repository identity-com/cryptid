import { CryptidClient, CryptidOptions } from "./cryptidClient";
import { AbstractCryptidClient } from "./abstractCryptidClient";
import { Wallet } from "../types/crypto";
import { CryptidAccountDetails } from "../lib/CryptidAccountDetails";

export class ControlledCryptidClient extends AbstractCryptidClient {
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
    private controllerCryptid: CryptidClient,
    options: CryptidOptions
  ) {
    // TODO fix when CryptidAccountDetails.defaultAccount is non-async
    const details = {} as CryptidAccountDetails; // await CryptidAccountDetails.defaultAccount(controlledDid);
    super(details, options);
    // TODO discover and store controller chain
  }

  get wallet(): Wallet {
    return this.controllerCryptid.wallet;
  }

  as(controlledDid: string): ControlledCryptidClient {
    return new ControlledCryptidClient(controlledDid, this, this.options);
  }
}
