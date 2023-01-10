import { GlowWalletAdapter } from '@solana/wallet-adapter-glow';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { registerWalletAdapter, SOLANA_MAINNET_CHAIN } from '@solana/wallet-standard';
import { useWallets, WalletProvider, WalletsProvider } from '@wallet-standard/react';
import type { FC, ReactNode } from 'react';
import React, { useEffect } from 'react';
import { getWallets, registerWallet } from '@wallet-standard/core';
import {UniqueCryptidWallet} from '../../unique-cryptid/src/wallet'
export const App: FC = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};

const Context: FC<{ children: NonNullable<ReactNode> }> = ({ children }) => {
    useEffect(() => {
        const adapters = [new PhantomWalletAdapter(), new GlowWalletAdapter()];
        const destructors = adapters.map((adapter) => registerWalletAdapter(adapter, SOLANA_MAINNET_CHAIN));
        return () => destructors.forEach((destroy) => destroy());
    }, []);
    registerWallet(new UniqueCryptidWallet(useWallets()[0]))

    return (
        <WalletsProvider>
            <WalletProvider>{children}</WalletProvider>
        </WalletsProvider>
    );
};

const Content: FC = () => {
    const { wallets } = useWallets();
    return (
        <div>
            <ul>
                {wallets.map((wallet, index) => (
                    <li key={index}>{'Cryptid'}</li>
                ))}
            </ul>
            <iframe src="http://localhost:3000/" />
        </div>
    );
};
