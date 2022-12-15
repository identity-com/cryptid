export { CryptidBuilder as Cryptid } from "./api/cryptidBuilder";
import {
  getCryptidAccountAddress,
  getCryptidAccountAddressFromDID,
} from "./lib/cryptid";
export { CryptidAccountDetails } from "./lib/CryptidAccountDetails";
export {
  CryptidClient,
  CryptidOptions,
  CreateOptions,
} from "./api/cryptidClient";
export { MiddlewareRegistry } from "./service/middlewareRegistry";
export { CRYPTID_PROGRAM } from "./constants";

export const util = {
  getCryptidAccountAddress,
  getCryptidAccountAddressFromDID,
};

// Types exports
export * from "./types";
