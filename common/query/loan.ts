import * as anchor from "@project-serum/anchor";

import { LISTINGS_PROGRAM_ID } from "../constants";
import { LoanData } from "../types";
import { Loan, LoanPretty } from "../model";
import { getProgram, getProvider } from "../provider";
import {
  fetchMetadata,
  fetchMetadataAccounts,
  assertMintIsWhitelisted,
} from "./common";

export async function findLoanAddress(
  mint: anchor.web3.PublicKey,
  borrower: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> {
  const [loanAddress] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("loan"), mint.toBuffer(), borrower.toBuffer()],
    LISTINGS_PROGRAM_ID
  );

  return loanAddress;
}

export async function fetchLoan(
  connection: anchor.web3.Connection,
  address: anchor.web3.PublicKey
): Promise<LoanPretty> {
  const provider = getProvider(connection);
  const program = getProgram(provider);

  const loanAccount = await program.account.loan.fetch(address);

  const [metadata] = await Promise.all([
    fetchMetadata(connection, loanAccount.mint),
    assertMintIsWhitelisted(loanAccount.mint),
  ]);

  return new Loan(loanAccount as LoanData, metadata, address).pretty();
}

export async function fetchMultipleLoans(
  connection: anchor.web3.Connection,
  filter: anchor.web3.GetProgramAccountsFilter[] = []
): Promise<LoanPretty[]> {
  const provider = getProvider(connection);
  const program = getProgram(provider);
  const listings = await program.account.loan
    .all(filter)
    .then((result) =>
      result.sort(
        (a, b) => a.account.amount.toNumber() - b.account.amount.toNumber()
      )
    );

  const metadataAccounts = await fetchMetadataAccounts(connection, listings);

  const combinedAccounts = listings.map((listing, index) => {
    const metadataAccount = metadataAccounts[index];

    if (metadataAccount) {
      return new Loan(
        listing.account as LoanData,
        metadataAccount,
        listing.publicKey
      ).pretty();
    }
    return null;
  });

  return combinedAccounts.filter(Boolean) as LoanPretty[];
}
