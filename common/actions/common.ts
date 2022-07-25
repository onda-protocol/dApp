import * as anchor from "@project-serum/anchor";
import * as splToken from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";

export async function getOrCreateTokenAccount(
  connection: anchor.web3.Connection,
  wallet: WalletContextState,
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> {
  if (!wallet.publicKey) {
    throw new Error("No wallet");
  }

  const response = await connection.getTokenAccountsByOwner(wallet.publicKey, {
    mint,
  });

  let tokenAccount: anchor.web3.PublicKey | undefined;

  // Ensure existing token account is rent exempt
  if (response.value[0]) {
    const rentExemptAmount = await connection.getMinimumBalanceForRentExemption(
      response.value[0].account.data.length
    );

    if (response.value[0].account.lamports >= rentExemptAmount) {
      tokenAccount = response.value[0].pubkey;
    }
  }

  if (tokenAccount === undefined) {
    [tokenAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        splToken.TOKEN_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const receiverAccount = await connection.getAccountInfo(tokenAccount);

    if (!receiverAccount) {
      const transaction = new anchor.web3.Transaction({
        feePayer: wallet.publicKey,
      });

      transaction.add(
        splToken.createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          tokenAccount,
          wallet.publicKey,
          mint,
          splToken.TOKEN_PROGRAM_ID,
          splToken.ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      const txId = await wallet.sendTransaction(transaction, connection);

      await connection.confirmTransaction(txId);
    }
  }

  if (tokenAccount === undefined) {
    throw new Error("Could not create token account");
  }

  return tokenAccount;
}
