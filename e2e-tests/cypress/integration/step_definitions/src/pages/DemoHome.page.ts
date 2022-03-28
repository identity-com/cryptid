/// <reference types="Cypress" />
import Chainable = Cypress.Chainable;
import { Page } from "./Page";
import { modal, demoPassHome, gatewayStatus } from "./Elements";
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
        cy.get('[data-testid="didWalletAddress"]')
            .invoke('text')
            .then((didWalletAddress) => {
                cy.writeFile('cypress/fixtures/didWalletAddress.txt', didWalletAddress);
            })
    }

    importCryptidAccount(alias: string): void {
        cy.findByText('Identity').click()
        cy.get('[data-testid="profileIcon"]', {timeout: 30000}).click()
        cy.findByText('Add Cryptid').click()
        cy.get('input[name="alias"]').clear()
        cy.get('input[name="alias"]').type(alias)
        cy.findByText('Import Cryptid Account', {timeout: 30000}).click();
        cy.get('[data-testid="publicAddressToImport"]').click()
        cy.fixture('didWalletAddress.txt').then((didWalletAddress) => {
            cy.get('[data-testid="publicAddressToImport"]').invoke('val', didWalletAddress)
            cy.get('[data-testid="publicAddressToImport"]').type(' ')
        })
        cy.get(modal.addButton).should('be.enabled').click({multiple: true, force: true});
    }

    createSenderNewKey(): void {
        cy.findByText('New Key', {timeout:30000}).click();
        cy.get(modal.addButton).should('be.enabled').click({ multiple: true, force: true});
        // cy.window()
        //     .then(() => {
        //         cy.get(modal.seedPhraseBox).should('not.be.empty')
        //         cy.get(modal.seedPhraseBox).invoke('val')
        //             .then((nmemonicPhrase) => {
        //                 // @ts-ignore
        //                 cy.writeFile('cypress/fixtures/nmemonicPhrase.txt', nmemonicPhrase);
        //                 cy.get(modal.acknowledgementCheckbox).click()
        //                 cy.get(modal.downloadSeedPhraseButton).click()
        //                 cy.get(modal.confirmPhraseBox).click()
        //                 cy.fixture('nmemonicPhrase.txt').then((nmemonicPhrase) => {
        //                     cy.get(modal.confirmPhraseBox).invoke('val', nmemonicPhrase)
        //                     cy.get(modal.confirmPhraseBox).type(' ')
        //                 });
        //                 cy.get(modal.addButton).should('be.enabled').click({ multiple: true, force: true});
        //                 cy.get(modal.addButton).should('be.enabled').click({ multiple: true, force: true});
        //             })
        //     })
    }
    //
    // createSecondKey(): void {
    //     cy.findByText('New Key', {timeout:30000}).click();
    //     cy.window()
    //         .then(() => {
    //             cy.get(modal.seedPhraseBox).should('not.be.empty')
    //             cy.get(modal.seedPhraseBox).invoke('val')
    //                 .then((nmemonicPhrase2) => {
    //                     // @ts-ignore
    //                     cy.writeFile('cypress/fixtures/nmemonicPhrase2.txt', nmemonicPhrase2);
    //                     cy.get(modal.acknowledgementCheckbox).click()
    //                     cy.get(modal.downloadSeedPhraseButton).click()
    //                     cy.get(modal.confirmPhraseBox).click()
    //                     cy.fixture('nmemonicPhrase2.txt').then((nmemonicPhrase2) => {
    //                         cy.get(modal.confirmPhraseBox).invoke('val', nmemonicPhrase2)
    //                         cy.get(modal.confirmPhraseBox).type(' ')
    //                     });
    //                     cy.get(modal.addButton).should('be.enabled').click({ multiple: true, force: true});
    //                     cy.get(modal.addButton).should('be.enabled').click({ multiple: true, force: true});
    //                 })
    //         })
    // }

    confirmWalletCreation(): void{
        cy.findByText('Tokens').click()
        cy.get('[data-testid="listedWallet"]', {timeout: 30000})
    }

    selectLocalnet(): void{
        cy.get('[data-testid="settingsIcon"]', {timeout: 30000}).click()
        cy.findByText('localnet').click()
    }

    addAdditionalCryptidAccount(): void{
        cy.get('[data-testid="profileIcon"]', {timeout: 30000}).click()
        cy.findByText('Add Cryptid').click()
    }

    switchCryptidAccount(accountName: string): void{
        cy.get('[data-testid="profileIcon"]', {timeout: 30000}).click()
        cy.findByText(accountName).click()
    }

    airdropSolana(): void{
        cy.wait(1000)
        cy.findByText('Request Airdrop').click()
        cy.get('[data-testid="solBalance"]').contains('5.0000 SOL', {timeout:5000})
        // cy.get('[data-testid="cryptidWalletAddress"]')
        //     .invoke('text')
        //     .then((cryptidWalletAddress) => {
        //         cy.writeFile('cypress/fixtures/cryptidWalletAddress.txt', cryptidWalletAddress);
        //         cy.exec(`solana airdrop 1 ${cryptidWalletAddress} --url https://api.devnet.solana.com`);
        //     });
    }

    confirmSolanaBalance(balance: string): void{
        cy.get('[data-testid="solBalance"]').contains(`${balance} SOL`, {timeout:5000})
        // cy.get('[data-testid="cryptidWalletAddress"]')
        //     .invoke('text')
        //     .then((cryptidWalletAddress) => {
        //         cy.writeFile('cypress/fixtures/cryptidWalletAddress.txt', cryptidWalletAddress);
        //         cy.exec(`solana airdrop 1 ${cryptidWalletAddress} --url https://api.devnet.solana.com`);
        //     });
    }

    airdropSolanaToDid(): void {
        cy.wait(1000)
        cy.get('[data-testid="exclamationCircleIcon"]').click()
        // cy.get('[data-testid="exclamationCircleIcon"]').click()
        cy.get('[data-testid="greenCheckbox"]', {timeout:30000})
        // cy.get('[data-testid="signerAirdrop"]').contains('val', '5.0000', {timeout:30000})
        // cy.findByText('Identity').click()
        // cy.get('[data-testid="didWalletAddress"]')
        //     .invoke('text')
        //     .then((didWalletAddress) => {
        //         cy.exec(`solana airdrop 1 ${didWalletAddress} --url https://api.devnet.solana.com`);
        //         cy.writeFile('cypress/fixtures/didWalletAddress.txt', didWalletAddress);
        //     })
    }

    addController(): void {
        cy.findByText('Identity').click()
        cy.get('[data-testid="controllersPlusCircleIcon"]').click()
        cy.window()
            .then(() => {
                cy.fixture('controllerAddress.txt').then((didWalletAddress) => {
                    cy.get('[data-testid="controllerAddressField"]').invoke('val', didWalletAddress)
                    cy.get('[data-testid="controllerAddressField"]').type(' ')
                    cy.get(modal.addButton).should('be.enabled').click({multiple: true, force: true});
                });
        })
    }

    copyRecipientWalletAddress(): void {
        cy.findByText('Identity').click()
        cy.get('[data-testid="cryptidWalletAddress"]')
            .invoke('text')
            .then((cryptidWalletAddress) => {
                cy.writeFile('cypress/fixtures/recipientWalletAddress.txt', cryptidWalletAddress);
            });
        cy.findByText('Tokens').click()
    }

    sendSolana(): void {
        cy.get('[data-testid="tokenButton"]').contains('Send').click()
        cy.fixture('recipientWalletAddress.txt').then((recipientWalletAddress) => {
            cy.get('[data-testid="recipientAddress"]').click().type(recipientWalletAddress)
        });
        cy.get('[data-testid="amount"]').click()
        cy.get('[data-testid="amount"]').type('1')
        cy.get(modal.addButton).should('be.enabled').click({ multiple: true, force: true});
    }
}
