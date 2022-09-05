import {PublicKey} from "@solana/web3.js";
import {ExtendedCluster} from "@identity.com/sol-did-client";

export const CRYPTID_PROGRAM = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

export const CHECK_RECIPIENT_MIDDLEWARE_PROGRAM = new PublicKey('midcHDoZsxvMmNtUr8howe8MWFrJeHHPbAyJF1nHvyf');
export const TIME_DELAY_MIDDLEWARE_PROGRAM = new PublicKey('midttN2h6G2CBvt1kpnwUsFXM6Gv7gratVwuo2XhSNk');

export const CLUSTER: ExtendedCluster = 'localnet';
