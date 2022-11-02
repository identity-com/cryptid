import { MiddlewareRegistry } from "@identity.com/cryptid-core-hh";

export * from "@identity.com/cryptid-core-hh";
export {
  CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
  CheckPassMiddleware,
  CheckPassParameters,
} from "@identity.com/cryptid-middleware-check-pass-hh";
export {
  CHECK_DID_MIDDLEWARE_PROGRAM_ID,
  CheckDidMiddleware,
  CheckDidParameters,
} from "@identity.com/cryptid-middleware-check-did-hh";
export {
  TIME_DELAY_MIDDLEWARE_PROGRAM_ID,
  TimeDelayMiddleware,
  TimeDelayParameters,
} from "@identity.com/cryptid-middleware-time-delay-hh";
export {
  CHECK_RECIPIENT_MIDDLEWARE_PROGRAM_ID,
  CheckRecipientMiddleware,
  CheckRecipientParameters,
} from "@identity.com/cryptid-middleware-check-recipient-hh";

import {
  CheckPassMiddleware,
  CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-check-pass-hh";

import {
  CheckDidMiddleware,
  CHECK_DID_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-check-did-hh";

import {
  TimeDelayMiddleware,
  TIME_DELAY_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-time-delay-hh";

import {
  CheckRecipientMiddleware,
  CHECK_RECIPIENT_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-check-recipient-hh";

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
