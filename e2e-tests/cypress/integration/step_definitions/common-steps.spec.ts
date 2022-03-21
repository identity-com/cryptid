/// <reference types="Cypress" />
import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps';
import { DemoHome } from '../step_definitions/src/pages/DemoHome.page';
import { iframe, gatewayStatus, demoPassHome, scopeRequestStatus } from '../step_definitions/src/pages/Elements';
import {
  nonUsIPAddress,
  vpnIpAddress,
  getGatekeeperEndpointRegex,
  usIPAddress,
  countryCodeIpOverride,
} from '../step_definitions/src/test-utils/constants';
// This is causing webpack compilation errors. Will work on fixing in a different ticket
// import { getConnection } from '@identity.com/solana-gatekeeper-lib';
// import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

const page = new DemoHome();
const stage = Cypress.env('stage');

//  Scenario: Select stage.
Given('I open to cryptid home page', () => {
  page.open();
});

When('I type wallet Alias name', () => {
  page.typeWalletAlias();
});

When('I create new key', () => {
  page.createNewKey();
});

