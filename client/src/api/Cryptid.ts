import {Connection, Transaction} from "@solana/web3.js";

export type CryptidOptions = {
  connection: Connection
}

export interface Cryptid {
  sign(transaction: Transaction):Promise<Transaction[]>
}
