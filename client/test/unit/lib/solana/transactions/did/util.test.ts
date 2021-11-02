import chai from 'chai';

import * as Util from '../../../../../../src/lib/solana/transactions/did/util';
import { DIDDocument } from 'did-resolver';

const { expect } = chai;

describe('transactions/did/util', () => {
  context('sanitizeDefaultKeys', () => {
    it('should remove the default key from the document if present', async () => {
      const doc: Partial<DIDDocument> = {
        verificationMethod: [
          {
            id: 'did:sol:x#default',
            type: '-',
            controller: '-',
          },
        ],
        capabilityInvocation: ['did:sol:x#default'],
      };

      Util.sanitizeDefaultKeys(doc);

      expect(doc.verificationMethod).not.to.exist;
      expect(doc.capabilityInvocation).not.to.exist;
    });
  });
});
