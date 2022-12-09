import { CryptidClient } from "./cryptidClient";
import { AbstractCryptidClient } from "./abstractCryptidClient";
import { Wallet } from "../types/crypto";

export class ControlledCryptidClient extends AbstractCryptidClient {
  /**
   * Create a controlled cryptid account. Controlled by the controllerDid
   *
   * A controlled cryptid has no key - the key is provided by the controller
   * @param controllerDid
   * @param controlledCryptid
   */
  constructor(
    private controllerDid: string,
    private controlledCryptid: CryptidClient
  ) {
    super(controlledCryptid.details, controlledCryptid.options);
  }

  get wallet(): Wallet {
    return this.controlledCryptid.wallet;
  }

  controlWith(controllerDid: string): CryptidClient {
    return new ControlledCryptidClient(controllerDid, this);
  }

  makeControllerChain(): string[] {
    return [
      this.controllerDid,
      ...this.controlledCryptid.makeControllerChain(),
    ];
  }
}
