/// <reference types="Cypress" />

export const modal = {
    acknowledgementCheckbox: "[type='checkbox']",
    downloadSeedPhraseButton: "[type='submit']",
    seedPhraseBox: '[data-testid="SEED_WORDS"]',
    confirmPhraseBox: '[data-testid="CONFIRMED_WORDS"]',
    addButton: '[data-testid="MODAL_ADD_BUTTON"]',


    acceptedBiometricsPolicyLink: 'https://www.civic.com/legal/biometric-policy-notice/',
    acceptedDeclaration: "1. You are verifying the specified wallet on your own behalf or on the behalf of the institution you represent.\n2. You are acting in your individual capacity or under direction of the institution you represent.\n3. You are not acting on behalf of, and will not use this wallet on behalf of, any other person or entity.\n4. Neither you nor any other person acting on your behalf are the target of any sanction, regulation, or law promulgated by the OFAC, FinCEN, or any other U.S. governmental entity, United Nations, Financial Action Task Force (\"FATF\"), or is residing in or obtaining funds via a jurisdiction designated to be non-cooperative with international anti-money laundering principles or procedures by an intergovernmental group or organization such as FATF.",
    nileAcceptedDeclaration: "1. You are verifying the specified wallet on your own behalf or on the behalf of the institution you represent.\n2. You are acting in your individual capacity or under direction of the institution you represent.\n3. You are not acting on behalf of, and will not use this wallet on behalf of, any other person or entity.\n4. Neither you nor any other person acting on your behalf are the target of any sanction, regulation, or law promulgated by the OFAC, FinCEN, or any other U.S. governmental entity, United Nations, Financial Action Task Force (\"FATF\"), or is residing in or obtaining funds via a jurisdiction designated to be non-cooperative with international anti-money laundering principles or procedures by an intergovernmental group or organization such as FATF.\n5. You are not a resident or citizen of China.\n6. Neither you nor any other person acting on your behalf will effect any transaction in this wallet while present in China.",
    acceptedTermsAndConditionsLink: "https://www.civic.com/legal/terms-of-service-civic-pass-v1",
    identityAuthTokenNull: 'null-enroll-auth-token',
    igniteAcceptedDeclaration: '1. You confirm, to your knowledge, that you\'re not a bot, do in fact breathe oxygen, and may or may not have what is commonly referred to as a soul.',
    igniteRefreshTitle: 'screens.ignitePass.authenticate.title',
    igniteRefreshDescription: 'screens.ignitePass.authenticate.description',
    selfieExplanation: 'screens.documentPass.explainer.selfieExplanation',
    governmentPhotoIdExplanation: 'screens.documentPass.explainer.governmentPhotoIdExplanation',
    genesisDeclarationText: '1. You are verifying this wallet on your own behalf and in your individual capacity, and you are not acting on behalf of, and will not use this wallet on behalf of, any other person or entity.\n2. You are not a resident of the United States or China.\n3. You are not a U.S. Person as defined in [Rule 902(k) of Regulation S under the U.S. Securities Act of 1933](https://www.law.cornell.edu/cfr/text/17/230.902).\n4. You are not a U.S. Person as defined in [CFTC Rule 23.23](https://www.law.cornell.edu/cfr/text/17/23.23).\n5. Neither you nor any other person acting on your behalf will effect any transaction in this wallet while present in the United States or China.\n6. Neither you nor any other person acting on your behalf are the target of any sanction, regulation, or law promulgated by the OFAC, FinCEN, or any other U.S. governmental entity, UN, FATF, or is residing in or obtaining funds via a jurisdiction designated to be non-cooperative with international anti-money laundering principles or procedures by an intergovernmental group or organization such as FATF.',
    failedIpTitle: 'screens.failedIPCheck.title',
    failedIpDescription: 'screens.failedIPCheck.description',
    backButton: 'BACK_BUTTON',
    appQrCode: 'APP_QRCODE',
    playStoreButton: 'PLAY_STORE_BUTTON',
    appStoreButton: 'APP_STORE_BUTTON',

    tokenRejectedTitle: 'screens.tokenRejected.title',
    tokenRejectedDescription: 'screens.tokenRejected.description',
    tokenRejectedSupportLink: 'screens.tokenRejected.supportLink',
    tokenRejectedSupportLinkHref: 'screens.tokenRejected.supportLinkHref',
    tokenActiveTitle: 'screens.tokenActive.title',
    tokenActivedDescription: 'screens.tokenActive.description',
    tokenActiveSupportLink: 'screens.tokenActive.supportLink',
    tokenActiveSupportLinkHref: 'screens.tokenActive.supportLinkHref',
    tokenRevokedTitle: 'screens.tokenRevoked.title',
    tokenRevokedDescription: 'screens.tokenRevoked.description',
    tokenRevokedSupportLink: 'screens.tokenRevoked.supportLink',
    tokenRevokedSupportLinkHref: 'screens.tokenRevoked.supportLinkHref',
    tokenFrozenTitle: 'screens.tokenFrozen.title',
    tokenFrozenDescription: 'screens.tokenFrozen.description',
    tokenFrozenSupportLink: 'screens.tokenFrozen.supportLink',
    tokenFrozenSupportLinkHref: 'screens.tokenFrozen.supportLinkHref',
    tokenInReviewTitle: 'screens.tokenInReview.title',
    tokenInReviewDescription: 'screens.tokenInReview.description',
    tokenInReviewSupportLink: 'screens.tokenInReview.supportLink',
    tokenInReviewSupportLinkHref: 'screens.tokenInReview.supportLinkHref',

    rejectedDescription: 'screens.documentPass.rejected.description',
    rejectedDocumentUnsupported: 'screens.documentPass.rejected.errors.document.unsupported',
    rejectedDocumentQuality: 'screens.documentPass.rejected.errors.document.quality',
    rejectedEmailNoRetriesRemaining: 'screens.documentPass.rejected.errors.step.no.retries',
    rejectedEmailCodeIncorrect: 'screens.documentPass.rejected.errors.email.token.mismatch',
    rejectedEmailGeneric: 'screens.documentPass.rejected.errors.generic',
    rejectedDocumentMinimumAge: 'screens.documentPass.rejected.errors.automatic.rejection.minimum.age'
}

export const onfido = {
    onfidoTitle: '.onfido-sdk-ui-PageTitle-titleSpan',
    uploadPhoto: '.onfido-sdk-ui-Theme-link',
    uploadButton: '.ods-button',
    confirmUpload: '.-action--primary',
    documentSelectorOption1: ':nth-child(1) > .onfido-sdk-ui-DocumentSelector-option > .onfido-sdk-ui-DocumentSelector-content',
    documentSelectorOption2: ':nth-child(2) > .onfido-sdk-ui-DocumentSelector-option > .onfido-sdk-ui-DocumentSelector-content',
    documentSelectorOption3: ':nth-child(3) > .onfido-sdk-ui-DocumentSelector-option > .onfido-sdk-ui-DocumentSelector-content'
}


export const gatewayStatus = {
    locationNotSupported: 'LOCATION_NOT_SUPPORTED',
    vpnNotSupported: 'VPN_NOT_SUPPORTED',
    notRequested: 'NOT_REQUESTED',
    collectingUserInfo: 'COLLECTING_USER_INFORMATION',
    inReview: 'IN_REVIEW',
    active: 'ACTIVE',
    powo: 'PROOF_OF_WALLET_OWNERSHIP',
    checking: 'CHECKING',
    frozen: 'FROZEN',
    revoked: 'REVOKED'
}

export const scopeRequestStatus = {
    verificationSuccess: 'verification-success',
    verificationFailed: 'verification-failed',
    awaitingUser: 'awaiting-user',
    userAcknowledged: 'user-acknowledged',
    userCancelled: 'user-cancelled',
    transactionComplete: 'transaction-complete',
    transactionError: 'transaction-error',
    partnerCancelled: 'partner-cancelled'
}

export const demoPassHome = {
    walletAddress: '[data-testid="WALLET_ADDRESS"]',
    connectWallet: '[data-testid="CONNECT_WALLET"]',
    clientSendsCheckbox: 'CLIENT_SENDS_CHECKBOX',
    disconnectWallet: '[data-testid="DISCONNECT_WALLET"]',
    requestToken: '[data-testid="REQUEST_TOKEN"]',
    gatewayStatus: '[data-testid="GATEWAY_STATUS"]',
    wrapperContainer: '[data-testid="WRAPPER_CONTAINER"]',
    confirmAlert: '#react-confirm-alert',
    gatekeeperNetwork: '[data-testid="GATEKEEPER_NETWORK"]',
    chainNetwork: '[data-testid="CHAIN_NETWORK"]',
    gatewayToken: '[data-testid="GATEWAY_TOKEN"]',
    powoProof: '[data-testid="POWO_PROOF"]',
    powoWallet: '[data-testid="POWO_WALLET"]',
    secretKey: '[data-testid="SECRET_KEY"]',
    walletMoreOptions: 'More options',
    showModal: 'TESTID_SHOWMODAL_',
    stageTestId: 'TESTID_STAGE_'
}

export const gatekeeper = {
    gatekeeperBaseUrl: 'http://localhost:3003/',
    expireButton: 'Expire_button',
    confirmButtonAction: 'confirm_button_action',
    freezeButton: 'Freeze_button',
    specificWalletAddress: '4qfrWoM7S2MyfC7hD1xRr2iYzjTHj9tstsiLravuecxZ',
    revokeButton: 'Revoke_button',
    extendExpiryButton: 'Extend Expiry_button',
    issueButton: 'Issue_button',
    unfreezeButton: 'Unfreeze_button'
}
