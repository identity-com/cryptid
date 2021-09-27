import { SinonSandbox } from 'sinon';
import { Connection } from '@solana/web3.js';

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// stub getRecentBlockhash to return a valid blockhash from mainnet, to avoid going to the blockchain
export const stubGetBlockhash = (sandbox: SinonSandbox): void => {
  sandbox.stub(Connection.prototype, 'getRecentBlockhash').resolves({
    blockhash: 'FFPCDfh4NE3rfq1xTeJiZ5dAECNftv1p8vYinDBUn8dw',
    feeCalculator: { lamportsPerSignature: 0 },
  });
};
