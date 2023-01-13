// Next, React
import { FC, useEffect, useState } from 'react';
import Link from 'next/link';

// Wallet
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// Components
import { RequestAirdrop } from '../../components/RequestAirdrop';
import pkg from '../../../package.json';

import bs58 from 'bs58'
// Store
import useUserSOLBalanceStore from '../../stores/useUserSOLBalanceStore';
import {Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction} from '@solana/web3.js';
import { build, Signer, util } from '@identity.com/cryptid';
export const HomeView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const balance = useUserSOLBalanceStore((s) => s.balance)
  const { getUserSOLBalance } = useUserSOLBalanceStore()

  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      getUserSOLBalance(wallet.publicKey, connection)
    }
  }, [wallet.publicKey, connection, getUserSOLBalance])



// Create (or provide) a Solana keypair
/*const did = util.publicKeyToDid(wallet.publicKey, 'devnet');
const mappedWallet = {
  sign: wallet.signTransaction
  //other methods
}
const keypair = Keypair.fromSecretKey(bs58.decode(wallet.p))
// Create the Cryptid instance
const cryptid = build(did, wallet, {
  connection,
  waitForConfirmation: true,
});
*/
  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl md:pl-12 font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#8B0000] to-[#FFCCCB]">
          Cryptid Wallet <span className='text-sm font-normal align-top text-slate-700'>v{pkg.version}</span>
        </h1>
        <h4 className="md:w-full text-center text-primary my-2">
          <p>Solana DID-aware on-chain signer and wallet integrations</p>
          All existing Solana wallets are automatically compatible with Cryptid.
        </h4>
        <div className="max-w-md mx-auto mockup-code bg-red-300 p-6 my-2">
          <pre data-prefix=">">
            <code className="truncate">Go To <a className='underline' href='/actions'>Actions</a> To Start using Cryptid  </code>
          </pre>
        </div>        
          <div className="text-center">
          {wallet && <p><div className="stats bg-primary text-primary-content">
  
  <div className="stat">
    <div className="stat-title">SOL Balance:</div>
    <div className="stat-value">{(balance || 0).toLocaleString()}</div>
    <div className="stat-basics">
      {/*<button className="btn btn-sm btn-success">Add funds</button>*/}
    </div>
  </div>
  
  
  
</div></p>}
        </div>
          <div className='font-bold text-lg'>
            <div className="overflow-x-auto">{/*
              <table className="table table-compact w-full">
                <thead>
                  <tr>
                    <th></th> 
                    <th>Cryptid Account</th> 
                    <th>Authority</th> 
                    <th>Account Metas</th> 
                    <th>Address</th> 
                    <th>Bump</th> 
                    <th>Index</th>
                  </tr>
                </thead> 
                <tbody>
              
                </tbody> 
    
              </table>*/}
            </div>

          </div>
        </div>
      </div>
  );
};
