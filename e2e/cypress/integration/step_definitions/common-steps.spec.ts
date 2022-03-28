/// <reference types="Cypress" />
import { Given, When, Then } from 'cypress-cucumber-preprocessor/steps';
import { DemoHome } from '../step_definitions/src/pages/DemoHome.page';
import { demoPassHome, scopeRequestStatus } from '../step_definitions/src/pages/Elements';


const page = new DemoHome();
const stage = Cypress.env('stage');

//  Scenario: Select stage.
Given('I open to cryptid home page', () => {
  page.open();
});

When(`I type wallet Alias name of {string}`, (string) => {
  page.typeWalletAlias(string);
});

When('I create recipient new key', () => {
  page.createRecipientNewKey();
});

When('I create sender new key', () => {
  page.createSenderNewKey();
});

// When('I create second new key', () => {
//   page.createSecondKey();
// });


When('Wallet is created', () => {
  page.confirmWalletCreation();
});

When('Wallet cryptid address is copied', () => {
  page.copyRecipientWalletAddress();
});

When('I select localnet', () => {
  page.selectLocalnet();
});

When('I airdrop solana to cryptid wallet address', () => {
  page.airdropSolana()
});

When('I airdrop solana to did address', () => {
  page.airdropSolanaToDid()
});

When('Controller is added', () => {
  // page.airdropSolana()
  // page.airdropSolanaToDid()
  page.addController()
});

When('I add additional cryptid account', () => {
  page.addAdditionalCryptidAccount();
});

When('I send 1 solana to recipient address', () => {
  page.sendSolana();
});

When(`Solana balance of {string} is confirmed`, (string) => {
  page.confirmSolanaBalance(string);
});

When(`I switch to account named {string}`, (string) => {
  page.switchCryptidAccount(string);
});

When('Wallet did address is copied', () => {
  page.copyAndSaveDid();
});

When(`I import account with alias of {string}`, (string) => {
  page.importCryptidAccount(string);
});

