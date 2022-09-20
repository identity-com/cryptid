/// <reference types="Cypress" />
import Chainable = Cypress.Chainable;
import { Page } from "./Page";
import { modal, cryptidUi } from "./Elements";
import '../../../../support/commands'


export class DemoHome extends Page {
    constructor() {
        super("/");
    }

    open() {
        cy.visit(Cypress.env('host'));
    }

    // Selectors
    typeWalletAlias(alias: string): void {
        cy.get('input[name="alias"]').clear()
        cy.get('input[name="alias"]').type(alias)
    }

    createRecipientNewKey(): void {
        cy.findByText('New Key', {timeout:30000}).click();
        cy.window()
            .then(() => {
                cy.get(modal.seedPhraseBox).should('not.be.empty')
                cy.get(modal.seedPhraseBox).invoke('val')
                    .then((nmemonicPhrase) => {
                        // @ts-ignore
                        cy.writeFile('cypress/fixtures/nmemonicPhrase.txt', nmemonicPhrase);
                        cy.get(modal.acknowledgementCheckbox).click()
                        cy.get(modal.downloadSeedPhraseButton).click()
                        cy.get(modal.confirmPhraseBox).click()
                        cy.fixture('nmemonicPhrase.txt').then((nmemonicPhrase) => {
                            cy.get(modal.confirmPhraseBox).invoke('val', nmemonicPhrase)
                            cy.get(modal.confirmPhraseBox).type(' ')
                        });
                        cy.get(modal.addButton).should('be.enabled').click({ multiple: true, force: true});
                        cy.get(modal.addButton).should('be.enabled').click({ multiple: true, force: true});
                    })
            })
    }

    copyAndSaveDid(): void {
        cy.findByText('Identity').click()
        cy.get(cryptidUi.didWalletAddress)
            .invoke('text')
            .then((didWalletAddress) => {
                cy.writeFile('cypress/fixtures/didWalletAddress.txt', didWalletAddress);
            })
    }

    importCryptidAccount(alias: string): void {
        cy.findByText('Identity').click()
        cy.get(cryptidUi.profileIcon, {timeout: 30000}).click()
        cy.findByText('Add Cryptid').click()
        cy.get(modal.alias).clear()
        cy.get(modal.alias).type(alias)
        cy.findByText('Import Cryptid Account', {timeout: 30000}).click();
        cy.get(modal.publicAddressToImport).click()
        cy.fixture('didWalletAddress.txt').then((didWalletAddress) => {
            cy.get(modal.publicAddressToImport).invoke('val', didWalletAddress)
            cy.get(modal.publicAddressToImport).type(' ')
        })
        cy.get(modal.addButton).should('be.enabled').click({multiple: true, force: true});
    }

    createSenderNewKey(): void {
        cy.findByText('New Key', {timeout: 30000}).click();
        cy.get(modal.addButton).should('be.enabled').click({multiple: true, force: true});
    }


    confirmWalletCreation(): void{
        cy.findByText('Tokens').click()
        cy.get(cryptidUi.listedWallet, {timeout: 30000})
    }

    selectLocalnet(): void{
        cy.get(cryptidUi.settingsIcon, {timeout: 30000}).click()
        cy.findByText('localnet').click()
    }

    addAdditionalCryptidAccount(): void{
        cy.get(cryptidUi.profileIcon, {timeout: 30000}).click()
        cy.findByText('Add Cryptid').click()
    }

    switchCryptidAccount(accountName: string): void{
        cy.get(cryptidUi.profileIcon, {timeout: 30000}).click()
        cy.findByText(accountName).click()
    }

    airdropSolana(): void {
        cy.wait(1000)
        cy.findByText('Request Airdrop').click()
        cy.get(cryptidUi.solBalance).contains('2.0000 SOL', {timeout: 5000})
    }

    confirmSolanaBalance(balance: string): void{
        cy.get(cryptidUi.solBalance).contains(`${balance} SOL`, {timeout:5000})
    }

    airdropSolanaToDid(): void {
        cy.wait(1000)
        cy.get(cryptidUi.exclamationCircleIcon).click()
        cy.get(cryptidUi.greenCheckbox, {timeout:30000})
    }

    addController(): void {
        cy.findByText('Identity').click()
        cy.get(cryptidUi.controllersPlusCircleIcon).click()
        cy.window()
            .then(() => {
                cy.fixture('controllerAddress.txt').then((didWalletAddress) => {
                    cy.get(cryptidUi.controllerAddressField).invoke('val', didWalletAddress)
                    cy.get(cryptidUi.controllerAddressField).type(' ')
                    cy.get(modal.addButton).should('be.enabled').click({multiple: true, force: true});
                });
        })
    }

    copyRecipientWalletAddress(): void {
        cy.findByText('Identity').click()
        cy.get(cryptidUi.cryptidWalletAddress)
            .invoke('text')
            .then((cryptidWalletAddress) => {
                cy.writeFile('cypress/fixtures/recipientWalletAddress.txt', cryptidWalletAddress);
            });
        cy.findByText('Tokens').click()
    }

    sendSolana(): void {
        cy.get(cryptidUi.tokenButton).contains('Send').click()
        cy.fixture('recipientWalletAddress.txt').then((recipientWalletAddress) => {
            cy.get(modal.recipientAddress).click().type(recipientWalletAddress)
        });
        cy.get(modal.amount).click()
        cy.get(modal.amount).type('1')
        cy.get(modal.addButton).should('be.enabled').click({ multiple: true, force: true});
    }
}
