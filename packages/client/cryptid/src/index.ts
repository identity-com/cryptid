import { MiddlewareRegistry } from "@identity.com/cryptid-core";

export * from "@identity.com/cryptid-core";
export {
  CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
  CheckPassMiddleware,
  CheckPassParameters,
} from "@identity.com/cryptid-middleware-check-pass";
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

import {
  CheckPassMiddleware,
  CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-check-pass";

import {
  TimeDelayMiddleware,
  TIME_DELAY_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-time-delay";

import {
  CheckRecipientMiddleware,
  CHECK_RECIPIENT_MIDDLEWARE_PROGRAM_ID,
} from "@identity.com/cryptid-middleware-check-recipient";

MiddlewareRegistry.get().register(
  CHECK_PASS_MIDDLEWARE_PROGRAM_ID,
  new CheckPassMiddleware()
);

MiddlewareRegistry.get().register(
  TIME_DELAY_MIDDLEWARE_PROGRAM_ID,
  new TimeDelayMiddleware()
);

MiddlewareRegistry.get().register(
  CHECK_RECIPIENT_MIDDLEWARE_PROGRAM_ID,
  new CheckRecipientMiddleware()
);
