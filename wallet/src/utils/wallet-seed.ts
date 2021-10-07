import { BinaryLike, pbkdf2 } from 'crypto';
import { randomBytes, secretbox } from 'tweetnacl';
import * as bip32 from 'bip32';
import bs58 from 'bs58';
import { EventEmitter } from 'events';
import { isExtension } from './utils';
import { useEffect, useState } from 'react';

export function normalizeMnemonic(mnemonic) {
  return mnemonic.trim().split(/\s+/g).join(" ");
}

export async function generateMnemonicAndSeed() {
  const bip39 = await import('bip39');
  const mnemonic = bip39.generateMnemonic(256);
  const seed = await bip39.mnemonicToSeed(mnemonic);
  return { mnemonic, seed: Buffer.from(seed).toString('hex') };
}

export async function mnemonicToSeed(mnemonic) {
  const bip39 = await import('bip39');
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid seed words');
  }
  const seed = await bip39.mnemonicToSeed(mnemonic);
  return Buffer.from(seed).toString('hex');
}

async function getExtensionUnlockedMnemonic() {
  if (!isExtension) {
    return null;
  }

  return new Promise<string>((resolve) => {
    chrome.runtime.sendMessage({
      channel: 'sollet_extension_mnemonic_channel',
      method: 'get',
    }, resolve);
  })
}

interface MnomicInterface {
  mnemonic: string | null,
  seed: string | null,
  importsEncryptionKey: Buffer | null,
  derivationPath: string | undefined,
}

const EMPTY_MNEMONIC: MnomicInterface = {
  mnemonic: null,
  seed: null,
  importsEncryptionKey: null,
  derivationPath: undefined,
};

let unlockedMnemonicAndSeed = (async (): Promise<MnomicInterface> => {
  const unlockedExpiration = localStorage.getItem('unlockedExpiration');
  // Left here to clean up stored mnemonics from previous method
  if (unlockedExpiration && Number(unlockedExpiration) < Date.now()) {
    localStorage.removeItem('unlocked');
    localStorage.removeItem('unlockedExpiration');
  }
  const stored = JSON.parse(
    (await getExtensionUnlockedMnemonic()) ||
    sessionStorage.getItem('unlocked') ||
      localStorage.getItem('unlocked') ||
      'null',
  );
  if (stored === null) {
    return EMPTY_MNEMONIC;
  }
  return {
    importsEncryptionKey: deriveImportsEncryptionKey(stored.seed),
    ...stored,
  };
})();

export const walletSeedChanged = new EventEmitter();

export function getUnlockedMnemonicAndSeed() {
  return unlockedMnemonicAndSeed;
}

// returns [mnemonic, loading]
export function useUnlockedMnemonicAndSeed(): [MnomicInterface, boolean] {
  const [currentUnlockedMnemonic, setCurrentUnlockedMnemonic] = useState<MnomicInterface|null>(null);
  
  useEffect(() => {
    walletSeedChanged.addListener('change', setCurrentUnlockedMnemonic);
    unlockedMnemonicAndSeed.then(setCurrentUnlockedMnemonic);
    return () => {
      walletSeedChanged.removeListener('change', setCurrentUnlockedMnemonic);
    }
  }, []);

  return !currentUnlockedMnemonic
    ? [EMPTY_MNEMONIC, true]
    : [currentUnlockedMnemonic, false];
}

export function useHasLockedMnemonicAndSeed() {
  const [unlockedMnemonic, loading] = useUnlockedMnemonicAndSeed();

  return [!unlockedMnemonic.seed && !!localStorage.getItem('locked'), loading];
}

function setUnlockedMnemonicAndSeed(
  mnemonic,
  seed,
  importsEncryptionKey,
  derivationPath,
) {
  const data = {
    mnemonic,
    seed,
    importsEncryptionKey,
    derivationPath,
  };
  unlockedMnemonicAndSeed = Promise.resolve(data);
  walletSeedChanged.emit('change', data);
}

export async function storeMnemonicAndSeed(
  mnemonic,
  seed,
  password,
  derivationPath,
) {
  const plaintext = JSON.stringify({ mnemonic, seed, derivationPath });
  if (password) {
    const salt = randomBytes(16);
    const kdf = 'pbkdf2';
    const iterations = 100000;
    const digest = 'sha256';
    const key = await deriveEncryptionKey(password, salt, iterations, digest);
    const nonce = randomBytes(secretbox.nonceLength);
    const encrypted = secretbox(Buffer.from(plaintext), nonce, key);
    localStorage.setItem(
      'locked',
      JSON.stringify({
        encrypted: bs58.encode(encrypted),
        nonce: bs58.encode(nonce),
        kdf,
        salt: bs58.encode(salt),
        iterations,
        digest,
      }),
    );
    localStorage.removeItem('unlocked');
  } else {
    localStorage.setItem('unlocked', plaintext);
    localStorage.removeItem('locked');
  }
  sessionStorage.removeItem('unlocked');
  if (isExtension) {
    chrome.runtime.sendMessage({
      channel: 'sollet_extension_mnemonic_channel',
      method: 'set',
      data: '',
    });
  }
  const importsEncryptionKey = deriveImportsEncryptionKey(seed);
  setUnlockedMnemonicAndSeed(
    mnemonic,
    seed,
    importsEncryptionKey,
    derivationPath,
  );
}

export async function loadMnemonicAndSeed(password, stayLoggedIn) {
  const lockedString = localStorage.getItem('locked')
  if (!lockedString) {
    throw new Error('Nothing stored in local storage');
  }

  const {
    encrypted: encodedEncrypted,
    nonce: encodedNonce,
    salt: encodedSalt,
    iterations,
    digest,
  } = JSON.parse(lockedString);
  const encrypted = bs58.decode(encodedEncrypted);
  const nonce = bs58.decode(encodedNonce);
  const salt = bs58.decode(encodedSalt);
  const key = await deriveEncryptionKey(password, salt, iterations, digest);
  const plaintext = secretbox.open(encrypted, nonce, key);
  if (!plaintext) {
    throw new Error('Incorrect password');
  }
  const decodedPlaintext = Buffer.from(plaintext).toString();
  const { mnemonic, seed, derivationPath } = JSON.parse(decodedPlaintext);
  if (stayLoggedIn) {
    if (isExtension) {
      chrome.runtime.sendMessage({
        channel: 'sollet_extension_mnemonic_channel',
        method: 'set',
        data: decodedPlaintext,
      });
    } else {
      sessionStorage.setItem('unlocked', decodedPlaintext);
    }
  }
  const importsEncryptionKey = deriveImportsEncryptionKey(seed);
  setUnlockedMnemonicAndSeed(
    mnemonic,
    seed,
    importsEncryptionKey,
    derivationPath,
  );
  return { mnemonic, seed, derivationPath };
}

async function deriveEncryptionKey(password: BinaryLike, salt: BinaryLike, iterations: number, digest: string) {
  return new Promise<Buffer>((resolve, reject) =>
    pbkdf2(
      password,
      salt,
      iterations,
      secretbox.keyLength,
      digest,
      (err, key) => (err ? reject(err) : resolve(key)),
    ),
  );
}

export function lockWallet() {
  setUnlockedMnemonicAndSeed(null, null, null, null);
}

// Returns the 32 byte key used to encrypt imported private keys.
function deriveImportsEncryptionKey(seed) {
  // SLIP16 derivation path.
  return bip32.fromSeed(Buffer.from(seed, 'hex')).derivePath("m/10016'/0")
    .privateKey;
}

export function forgetWallet() {
  localStorage.clear();
  sessionStorage.removeItem('unlocked');
  if (isExtension) {
    chrome.runtime.sendMessage({
      channel: 'sollet_extension_mnemonic_channel',
      method: 'set',
      data: '',
    });
  }
  unlockedMnemonicAndSeed = Promise.resolve(EMPTY_MNEMONIC);
  walletSeedChanged.emit('change', unlockedMnemonicAndSeed);
  if (isExtension) {
    // Must use wrapper function for window.location.reload
    chrome.storage.local.clear(() => window.location.reload());
  } else {
    window.location.reload();
  }
}
