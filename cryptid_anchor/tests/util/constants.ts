import {PublicKey} from "@solana/web3.js";
import {ExtendedCluster} from "@identity.com/sol-did-client";

export const CRYPTID_PROGRAM = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

export const CHECK_RECIPIENT_MIDDLEWARE_PROGRAM = new PublicKey('midcHDoZsxvMmNtUr8howe8MWFrJeHHPbAyJF1nHvyf');
export const CHECK_PASS_MIDDLEWARE_PROGRAM = new PublicKey('midpT1DeQGnKUjmGbEtUMyugXL5oEBeXU3myBMntkKo');

export const CLUSTER: ExtendedCluster = 'localnet';
