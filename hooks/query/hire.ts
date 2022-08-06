import * as anchor from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "react-query";
import bs58 from "bs58";

import * as query from "../../common/query";

export const getHireQueryKey = (
  hireAddress: anchor.web3.PublicKey | undefined
) => ["hire", hireAddress?.toBase58()];

export function useHireQuery(hireAddress: anchor.web3.PublicKey | undefined) {
  const { connection } = useConnection();

  return useQuery(
    getHireQueryKey(hireAddress),
    () => {
      if (hireAddress) return query.fetchHire(connection, hireAddress);
    },
    { enabled: Boolean(hireAddress) }
  );
}

export const getHiresQueryKey = () => ["hires"];

export function useHiresQuery() {
  const { connection } = useConnection();

  return useQuery(
    getHiresQueryKey(),
    () => {
      return query.fetchMultipleHires(connection, [
        {
          memcmp: {
            // filter listed
            offset: 8,
            bytes: bs58.encode([0]),
          },
        },
      ]);
    },
    {
      refetchOnWindowFocus: false,
    }
  );
}

export const getLenderHiresQueryKey = (
  walletAddress: anchor.web3.PublicKey | undefined
) => ["lenderHires", walletAddress?.toBase58()];

export function useLenderHiresQuery() {
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();

  return useQuery(
    getLenderHiresQueryKey(anchorWallet?.publicKey),
    () => {
      if (anchorWallet) {
        return query.fetchMultipleHires(connection, [
          {
            memcmp: {
              // filter lender
              offset: 8 + 1 + 8,
              bytes: anchorWallet.publicKey.toBase58(),
            },
          },
        ]);
      }
    },
    {
      enabled: Boolean(anchorWallet?.publicKey),
      refetchOnWindowFocus: false,
    }
  );
}

export const getBorrowerHiresQueryKey = (
  walletAddress: anchor.web3.PublicKey | undefined
) => ["borrowerHires", walletAddress?.toBase58()];

export function useBorrowerHiresQuery() {
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();

  return useQuery(
    getBorrowerHiresQueryKey(anchorWallet?.publicKey),
    () => {
      if (anchorWallet) {
        return query.fetchMultipleHires(connection, [
          {
            memcmp: {
              // filter borrower
              offset: 8 + 1 + 8 + 32 + 1,
              bytes: anchorWallet?.publicKey.toBase58(),
            },
          },
        ]);
      }
    },
    {
      enabled: Boolean(anchorWallet?.publicKey),
      refetchOnWindowFocus: false,
    }
  );
}