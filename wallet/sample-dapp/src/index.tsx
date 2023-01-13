import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';
import { getWallets, registerWallet } from '@wallet-standard/core';
import {UniqueCryptidWallet} from '../../unique-cryptid/src/wallet'
// Create a reference to your wallet's existing API.

ReactDOM.render(
    <StrictMode>
        <App />
    </StrictMode>,
    document.getElementById('app')
);
