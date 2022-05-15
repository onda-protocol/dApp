import * as anchor from "@project-serum/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import IDL from "../idl.json";
import { DexloanListings } from "../dexloan";

export const PROGRAM_ID = new anchor.web3.PublicKey(
  "H6FCxCy2KCPJwCoUb9eQCSv41WZBKQaYfB6x5oFajzfj"
);

export function getProgram(
  provider: anchor.AnchorProvider
): anchor.Program<DexloanListings> {
  return new anchor.Program(IDL as any, PROGRAM_ID, provider);
}

export function getProvider(
  connection: anchor.web3.Connection,
  wallet?: AnchorWallet
): anchor.AnchorProvider {
  wallet = wallet || new MockWallet(anchor.web3.Keypair.generate());

  return new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions()
  );
}

class MockWallet implements anchor.Wallet {
  constructor(readonly payer: anchor.web3.Keypair) {}

  async signTransaction(
    tx: anchor.web3.Transaction
  ): Promise<anchor.web3.Transaction> {
    tx.partialSign(this.payer);
    return tx;
  }

  async signAllTransactions(
    txs: anchor.web3.Transaction[]
  ): Promise<anchor.web3.Transaction[]> {
    return txs.map((t) => {
      t.partialSign(this.payer);
      return t;
    });
  }

  get publicKey(): anchor.web3.PublicKey {
    return this.payer.publicKey;
  }
}