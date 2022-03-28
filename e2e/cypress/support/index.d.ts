/// <reference types="Cypress" />
declare namespace Cypress {
    interface Chainable {
        /**
         * Custom command to select DOM element by data-testid attribute.
         * @example cy.getByTestId('greeting')
         */
        getByTestId(
            value: string,
            options?: Partial<Loggable & Timeoutable & Withinable & Shadow>
        ): Chainable<Element>;

        /**
         * Custom command to select DOM element by any attribute.
         * @example cy.getByAttribute('data-value', 'thing1')
         * @param attribute
         * @param value
         * @param options
         */
        getByAttribute(
            attribute: string,
            value: string,
            options?: Partial<Loggable & Timeoutable & Withinable & Shadow>
        ): Chainable<Element>;
    }
}
