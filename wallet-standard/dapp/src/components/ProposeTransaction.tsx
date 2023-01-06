import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { ConfirmOptions, Keypair, SystemProgram, Transaction, TransactionSignature } from '@solana/web3.js';
import { FC, useCallback } from 'react';
import { notify } from "../utils/notifications";
import {CryptidService} from './cryptid'
import * as anchor from '@project-serum/anchor';
import { Program, AnchorProvider } from "@project-serum/anchor";
import { CryptidIDL } from "@identity.com/cryptid-idl";
import { CRYPTID_PROGRAM } from '../constants';
import { Cryptid} from '@identity.com/cryptid';

export const ProposeTransaction: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const wallet = useAnchorWallet()




    const onClick = useCallback(async () => {
        if (!publicKey) {
            notify({ type: 'error', message: `Wallet not connected!` });
            console.log('error', `Send Transaction: Wallet not connected!`);
            return;
        }
        

        let signature: TransactionSignature = '';
        try {
            const did = `did:sol:${wallet.publicKey.toBase58()}`

            const cryptid = await Cryptid.buildFromDID(did, wallet, connection);

            console.log("Cryptid account:", cryptid.address());

            const transferTransaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: Keypair.generate().publicKey,
                    lamports: 1_000_000,
                })
            );

            const {proposeTransaction, proposeSigners, transactionAccount} = await cryptid.propose(transferTransaction);
            await cryptid.send(proposeTransaction, proposeSigners);

            const {executeTransactions, executeSigners} = await cryptid.execute(transactionAccount);
            executeTransactions.forEach(async (tx) => await cryptid.send(tx, executeSigners));
            
            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed!`, description: error?.message, txid: signature });
            return;
        }
    }, [publicKey, notify, connection, sendTransaction]);

    return (
        <div>
            <button
                className="group w-60 m-2 btn animate-pulse disabled:animate-none bg-gradient-to-r from-[#8B0000] to-[#FFCCCB] hover:from-pink-500 hover:to-yellow-500 ... "
                onClick={onClick} disabled={!publicKey}
            >
                <div className="hidden group-disabled:block ">
                    Wallet not connected
                </div>
                <span className="block group-disabled:hidden" > 
                    Propose Transaction
                </span>
            </button>
        </div>
    );
};
