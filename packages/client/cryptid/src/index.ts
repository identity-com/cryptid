import { MiddlewareRegistry } from "@identity.com/cryptid-core";

export * from "@identity.com/cryptid-core";
export {
  CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
  CheckPassMiddleware,
  CheckPassParameters,
} from "@identity.com/cryptid-middleware-check-pass";
export {
  CHECK_DID_MIDDLEWARE_PROGRAM_ID,
  CheckDidMiddleware,
  CheckDidParameters,
} from "@identity.com/cryptid-middleware-check-did";
export {
  TIME_DELAY_MIDDLEWARE_PROGRAM_ID,
  TimeDelayMiddleware,
  TimeDelayParameters,
} from "@identity.com/cryptid-middleware-time-delay";
export {
  CHECK_RECIPIENT_MIDDLEWARE_PROGRAM_ID,
  CheckRecipientMiddleware,
  CheckRecipientParameters,
} from "@identity.com/cryptid-middleware-check-recipient";
export {
  SUPERUSER_CHECK_SIGNER_MIDDLEWARE_PROGRAM_ID,
  SuperuserCheckSignerMiddleware,
  SuperuserCheckSignerParameters,
} from "@identity.com/cryptid-middleware-superuser-check-signer";

import {
  CheckPassMiddleware,
  CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-check-pass";

import {
  CheckDidMiddleware,
  CHECK_DID_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-check-did";

import {
  TimeDelayMiddleware,
  TIME_DELAY_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-time-delay";

import {
  CheckRecipientMiddleware,
  CHECK_RECIPIENT_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-check-recipient";

import {
  SuperuserCheckSignerMiddleware,
  SUPERUSER_CHECK_SIGNER_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-superuser-check-signer";

MiddlewareRegistry.get().register(
  CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
  new CheckPassMiddleware()
);

MiddlewareRegistry.get().register(
  CHECK_DID_MIDDLEWARE_PROGRAM_ID,
  new CheckDidMiddleware()
);

MiddlewareRegistry.get().register(
  TIME_DELAY_MIDDLEWARE_PROGRAM_ID,
  new TimeDelayMiddleware()
);

MiddlewareRegistry.get().register(
  CHECK_RECIPIENT_MIDDLEWARE_PROGRAM_ID,
  new CheckRecipientMiddleware()
);

MiddlewareRegistry.get().register(
    SUPERUSER_CHECK_SIGNER_MIDDLEWARE_PROGRAM_ID,
    new SuperuserCheckSignerMiddleware()
);