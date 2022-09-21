/// <reference types="Cypress" />

import VisitOptions = Cypress.VisitOptions;

export let page: Page | null = null;

export abstract class Page {
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  protected invokeAction(action: Record<string, unknown>): this {
    cy.window().its("store").invoke("dispatch", action);
    return this;
  }

  initializeWithNetwork(network: string): this {
    return this.invokeAction({
      type: "wallet/selectCluster",
      payload: network,
    });
  }

  visit(options?: Partial<VisitOptions>): this {
    cy.visit(this.path, options);

    cy.wrap(this).as("page");
    page = this;

    return this;
  }
}
