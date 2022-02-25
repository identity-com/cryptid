import { AssignablePublicKey } from '../../../../../src/lib/solana/model/AssignablePublicKey';
import { Keypair, PublicKey } from '@solana/web3.js';
import chai from 'chai';

const { expect } = chai;

describe('model/AssignablePublicKey', () => {
  let key: PublicKey;

  before(() => {
    key = Keypair.generate().publicKey;
  });

  it('creates and validates an AssignablePublicKey using static parse', () => {
    const apk = AssignablePublicKey.parse(key.toBase58());

    expect(apk.toPublicKey().toBase58()).to.equal(key.toBase58());
  });

  it('creates and validates an AssignablePublicKey using fromPublicKey', () => {
    const apk = AssignablePublicKey.fromPublicKey(key);

    expect(apk.toPublicKey().toBase58()).to.equal(key.toBase58());
  });
});
