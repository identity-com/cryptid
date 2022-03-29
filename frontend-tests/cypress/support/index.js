// load type definitions that come with Cypress module
/// <reference types="cypress" />
import "cypress-pipe";
import "./commands";

afterEach(function() {
    if (this.currentTest.state === 'failed' &&
        //@ts-ignore
        this.currentTest._currentRetry === this.currentTest._retries) {
        //@ts-ignore
        Cypress.runner.stop();
        //@ts-ignore
        throw new Error("Test failed")
    }
});
