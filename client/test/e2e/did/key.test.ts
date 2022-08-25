import { build, Cryptid } from '../../../src';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { airdrop, Balances } from '../../utils/solana';
import { publicKeyToDid } from '../../../src/lib/solana/util';
import chai from 'chai';
import {
  expectDocumentNotToIncludeKey,
  expectDocumentToIncludeKey,
} from '../../utils/did';
import { DidSolIdentifier } from '@identity.com/sol-did-client';

const { expect } = chai;

describe('DID Key operations', function () {
  this.timeout(60_000);

  let connection: Connection;
  let balances: Balances;

  let key: Keypair;
  let did: string;
  let doaSigner: PublicKey;
  let cryptid: Cryptid;
  let feePerSignature: number;

  before(async () => {
    connection = new Connection('http://localhost:8899', 'confirmed');
    feePerSignature = (await connection.getRecentBlockhash()).feeCalculator.lamportsPerSignature;
  });

  beforeEach(async () => {
    key = Keypair.generate();
    did = publicKeyToDid(key.publicKey, 'localnet');

    cryptid = await build(did, key, {
      connection,
      waitForConfirmation: true,
    });
    doaSigner = await cryptid.address();

    await Promise.all([
      airdrop(connection, doaSigner), // the main funds for the cryptid account
      airdrop(connection, key.publicKey), // funds retained by the signer key
    ]);
  });

  context('addKey', () => {
    let newKey: PublicKey;
    let newKeyAlias: string;

    beforeEach(async () => {
      newKey = Keypair.generate().publicKey;
      newKeyAlias = 'mobile';

      balances = await new Balances(connection).register(
        doaSigner,
        key.publicKey,
        newKey
      );
    });

    context('with a generative DID', () => {
      const [expectedFee, expectedRent] = [5000, 11330880];

      it('should register the DID and add a key', async () => {
        await cryptid.addKey(newKey, newKeyAlias);

        await balances.recordAfter();

        const document = await cryptid.document();
        expectDocumentToIncludeKey(document, newKey);

        // cryptid account paid rent
        expect(balances.for(doaSigner)).to.equal(-expectedRent);
        // signer paid fee
        expect(balances.for(key.publicKey)).to.equal(-expectedFee);
      });

      it('should charge rent to the signer key, if SIGNER_PAYS is set', async () => {
        cryptid = build(did, key, {
          connection,
          waitForConfirmation: true,
          rentPayer: 'SIGNER_PAYS',
        });

        await cryptid.addKey(newKey, newKeyAlias);

        await balances.recordAfter();

        const document = await cryptid.document();
        expectDocumentToIncludeKey(document, newKey);

        // cryptid account paid nothing
        expect(balances.for(doaSigner)).to.equal(0);
        // signer paid fee and rent
        expect(balances.for(key.publicKey)).to.equal(
          -(expectedFee + expectedRent)
        );
      });
    });

    context('with an anchored DID', () => {
      beforeEach(async () => {
        // add a key to upgrade (anchor) the did
        await cryptid.addKey(Keypair.generate().publicKey, 'ledger');

        // re-record the before balances, now that everything is set up
        await balances.recordBefore();
      });

      it('should add a new key', async () => {
        await cryptid.addKey(newKey, newKeyAlias);

        await balances.recordAfter();

        const document = await cryptid.document();
        expectDocumentToIncludeKey(document, newKey);
        expect(document.capabilityInvocation).to.have.lengthOf(3);

        // cryptid account paid nothing
        expect(balances.for(doaSigner)).to.equal(0);
        // signer paid fee
        expect(balances.for(key.publicKey)).to.equal(-feePerSignature);
      });

      it('should add a new key, if SIGNER_PAYS is set', async () => {
        cryptid = await build(did, key, {
          connection,
          waitForConfirmation: true,
          rentPayer: 'SIGNER_PAYS',
        });

        await cryptid.addKey(newKey, newKeyAlias);

        await balances.recordAfter();

        const document = await cryptid.document();
        expectDocumentToIncludeKey(document, newKey);

        // cryptid account paid nothing
        expect(balances.for(doaSigner)).to.equal(0);
        // signer paid fee
        expect(balances.for(key.publicKey)).to.equal(-feePerSignature);
      });
    });
  });

  context('removeKey', () => {
    beforeEach(async () => {
      balances = await new Balances(connection).register(
        doaSigner,
        key.publicKey
      );
    });

    // TODO Unskip when the sol-did program supports this
    context.skip('with a generative DID', () => {
      const [expectedFee, expectedRent] = [5000, 11330880];

      it('should register the DID to remove the default key', async () => {
        await cryptid.removeKey('default');

        await balances.recordAfter();

        const document = await cryptid.document();

        console.log(document);
        expectDocumentNotToIncludeKey(document, key.publicKey);

        // cryptid account paid rent
        expect(balances.for(doaSigner)).to.equal(-expectedRent);
        // signer paid fee
        expect(balances.for(key.publicKey)).to.equal(-expectedFee);
      });
    });

    context('with an anchored DID', () => {
      let ledgerKey: Keypair;

      beforeEach(async () => {
        // add a key to upgrade (anchor) the did
        ledgerKey = Keypair.generate();
        await Promise.all([
          cryptid.addKey(ledgerKey.publicKey, 'ledger'),
          airdrop(connection, ledgerKey.publicKey),
        ]);

        // re-record the before balances, now that everything is set up
        await balances.recordBefore();
      });

      it('should remove the added key', async () => {
        await cryptid.removeKey('ledger');

        await balances.recordAfter();

        const document = await cryptid.document();
        expectDocumentNotToIncludeKey(document, ledgerKey.publicKey);
        expectDocumentToIncludeKey(document, key.publicKey);
        expect(document.verificationMethod).to.have.lengthOf(1);
        expect(document.capabilityInvocation).to.have.lengthOf(1);

        // cryptid account paid nothing
        expect(balances.for(doaSigner)).to.equal(0);
        // signer paid fee
        expect(balances.for(key.publicKey)).to.equal(-feePerSignature);
      });

      it('should use the added key to remove the original key', async () => {
        // create a cryptid object using the ledger key instead of the default one
        cryptid = await build(did, ledgerKey, {
          connection,
          waitForConfirmation: true,
        });

        const defaultId = DidSolIdentifier.parse(cryptid.did);
        defaultId.fragment = 'default';
        const ledgerId = DidSolIdentifier.parse(cryptid.did);
        ledgerId.fragment = 'ledger';

        let document = await cryptid.document();
        expect(document.capabilityInvocation).to.include(defaultId.toString());
        expect(document.capabilityInvocation).to.include(ledgerId.toString());

        await cryptid.removeKey('default');

        document = await cryptid.document();
        expect(document.capabilityInvocation).to.not.include(
          defaultId.toString()
        );
        expect(document.capabilityInvocation).to.include(ledgerId.toString());
        expect(document.capabilityInvocation).to.have.lengthOf(1);
      });
    });
  });
});
