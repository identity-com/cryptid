import {MiddlewareRegistry} from "@identity.com/cryptid-core";

export * from '@identity.com/cryptid-core';
export * from '@identity.com/cryptid-middleware-check-pass';
import { CheckPassMiddleware, CHECK_PASS_MIDDLEWARE_PROGRAM_ID } from '@identity.com/cryptid-middleware-check-pass';


MiddlewareRegistry.get().register(CHECK_PASS_MIDDLEWARE_PROGRAM_ID, new CheckPassMiddleware());