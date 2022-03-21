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
    typeWalletAlias(): Chainable {
        return cy.get('input[name="alias"]').type('cypress-test-1')
    }

    createNewKey(): void {
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
                        cy.get(modal.addButton).should('be.enabled').click({ multiple: true });
                    })
            })
    }
}
