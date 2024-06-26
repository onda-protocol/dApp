import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import * as anchor from "@project-serum/anchor";
import { LoanState } from "@prisma/client";
import { QueryClient, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";

import * as actions from "../../common/actions";
import * as query from "../../common/query";
import * as utils from "../../common/utils";
import {
  CollectionJson,
  LoanJson,
  LoanOfferJson,
  GroupedLoanOfferJson,
} from "../../common/types";
import {
  fetchMetadata,
  findCollectionAddress,
  findLoanAddress,
  findMetadataAddress,
} from "../../common/query";
import { fetchLoanOffers, fetchCollection, LoanOfferFilters } from "../query";

export interface AskLoanMutationVariables {
  mint: anchor.web3.PublicKey;
  collectionMint: anchor.web3.PublicKey;
  options: {
    amount: number;
    basisPoints: number;
    duration: number;
  };
}

export const useAskLoanMutation = (onSuccess: () => void) => {
  const queryClient = useQueryClient();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  return useMutation(
    (variables: AskLoanMutationVariables) => {
      if (anchorWallet) {
        return actions.askLoan(
          connection,
          anchorWallet,
          variables.mint,
          variables.collectionMint,
          variables.options
        );
      }
      throw new Error("Not ready");
    },
    {
      onError(err) {
        console.error("Error: " + err);
        if (err instanceof Error) {
          toast.error("Error: " + err.message);
        }
      },
      async onSuccess(_, variables) {
        if (anchorWallet) {
          const loanPda = await findLoanAddress(
            variables.mint,
            anchorWallet?.publicKey
          );
          const collectionPda = await findCollectionAddress(
            variables.collectionMint
          );
          const [metdataPda] = await findMetadataAddress(variables.mint);

          const metadata = await queryClient.fetchQuery(
            ["metadata", metdataPda.toBase58()],
            () => fetchMetadata(connection, metdataPda)
          );
          const collection = await queryClient.fetchQuery(
            ["collection", variables.collectionMint.toBase58()],
            () => fetchCollection(variables.collectionMint.toBase58())
          );

          const newLoan: LoanJson = {
            address: loanPda.toBase58(),
            amount: utils.toHexString(variables.options.amount),
            outstanding: utils.toHexString(variables.options.amount),
            basisPoints: variables.options.basisPoints,
            creatorBasisPoints: collection.loanBasisPoints,
            duration: utils.toHexString(variables.options.duration),
            state: LoanState.Listed,
            borrower: anchorWallet.publicKey.toBase58(),
            mint: variables.mint.toBase58(),
            collectionAddress: variables.collectionMint.toBase58(),
            installments: 1,
            currentInstallment: 0,
            uri: metadata?.data.uri ?? "",
            tokenMint: null,
            threshold: null,
            noticeIssued: null,
            startDate: null,
            lender: null,
            Collection: collection,
          };

          const queryCache = queryClient.getQueryCache();
          const queries = queryCache.findAll(["loans"], { exact: false });

          queries
            .map((query) => query.queryKey)
            .forEach((key) => {
              if (
                key[1] &&
                typeof key[1] === "object" &&
                "collection" in key[1] &&
                key[1].collection !== collectionPda.toBase58()
              ) {
                return;
              }

              queryClient.setQueryData<LoanJson[]>(key, (loans = []) => {
                return [...loans, newLoan];
              });
            });

          queryClient.setQueriesData(["loan", loanPda.toBase58()], newLoan);
        }
        toast.success("Listing created");
        onSuccess();
      },
    }
  );
};

export interface OfferLoanMutationVariables {
  collection: anchor.web3.PublicKey;
  collectionMint: anchor.web3.PublicKey;
  options: {
    count: number;
    amount: number;
    basisPoints: number;
    duration: number;
  };
}

function pickOfferIds(offers: LoanOfferJson[], count: number) {
  const ids = [];
  const existingIds = offers.map((offer) => offer.offerId);

  let id = 0;
  while (ids.length < count && id <= 255) {
    if (!existingIds.includes(id)) {
      ids.push(id);
    }
    id++;
  }

  return ids;
}

export const useOfferLoanMutation = (onSuccess: () => void) => {
  const queryClient = useQueryClient();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  return useMutation(
    async (variables: OfferLoanMutationVariables) => {
      if (anchorWallet) {
        const currentOffers = await fetchLoanOffers({
          lender: anchorWallet.publicKey.toBase58(),
          collections: [variables.collection.toBase58()],
        });
        const ids = pickOfferIds(currentOffers, variables.options.count);

        return actions.offerLoan(
          connection,
          anchorWallet,
          variables.collection,
          variables.collectionMint,
          variables.options,
          ids
        );
      }
      throw new Error("Not ready");
    },
    {
      onError(err) {
        console.error("Error: " + err);
        if (err instanceof Error) {
          toast.error("Error: " + err.message);
        }
      },
      async onSuccess(newOffers, variables) {
        if (anchorWallet) {
          const collection = await queryClient.fetchQuery<CollectionJson>(
            ["collection", variables.collectionMint.toBase58],
            () => fetchCollection(variables.collectionMint.toBase58())
          );

          const amount = utils.toHexString(variables.options.amount);
          const duration = utils.toHexString(variables.options.duration);
          const basisPoints = variables.options.basisPoints;
          const lender = anchorWallet.publicKey.toBase58();
          const newLoanOffers: LoanOfferJson[] = newOffers.map(
            ([address, id]) => ({
              address: address.toBase58(),
              offerId: id,
              amount,
              duration,
              lender,
              basisPoints,
              ltv: null,
              threshold: null,
              collectionAddress: variables.collection.toBase58(),
              Collection: collection,
            })
          );

          const groupedOffer: GroupedLoanOfferJson = {
            _count: newOffers.length,
            amount: utils.toHexString(variables.options.amount),
            duration: utils.toHexString(variables.options.duration),
            basisPoints: variables.options.basisPoints,
            Collection: collection,
          };

          const queryCache = queryClient.getQueryCache();
          const groupedQueries = queryCache.findAll(
            ["loan_offers", "grouped"],
            {
              exact: false,
            }
          );
          groupedQueries.forEach((query) => {
            if (
              query.queryKey[2] &&
              typeof query.queryKey[2] === "object" &&
              "collection" in query.queryKey[2] &&
              query.queryKey[2].collection !== variables.collection
            ) {
              return;
            }

            queryClient.setQueryData<GroupedLoanOfferJson[]>(
              query.queryKey,
              (groupedOffers = []) => {
                let shouldAppend = true;

                const updated = groupedOffers.map((o) => {
                  if (
                    o.amount === groupedOffer.amount &&
                    o.duration === groupedOffer.duration &&
                    o.basisPoints === groupedOffer.basisPoints &&
                    o.Collection.address === groupedOffer.Collection.address
                  ) {
                    shouldAppend = false;
                    return {
                      ...o,
                      _count: o._count + newOffers.length,
                    };
                  }
                  return o;
                });

                if (shouldAppend) {
                  updated.push(groupedOffer);
                }

                return updated;
              }
            );
          });
          const offerQueries = queryCache.findAll(["loan_offers", "all"], {
            exact: false,
          });
          offerQueries.forEach((query) => {
            const filters = query.queryKey[2] as LoanOfferFilters | undefined;

            if (!filters) return;

            if (
              filters.collections?.includes(groupedOffer.Collection.address) &&
              filters.amount === amount &&
              filters.duration === duration &&
              filters.basisPoints === basisPoints
            ) {
              queryClient.setQueryData<LoanOfferJson[]>(
                query.queryKey,
                (offers = []) => {
                  return [...offers, ...newLoanOffers];
                }
              );
            }
          });
        }
        toast.success("Loan offer(s) created");
        onSuccess();
      },
    }
  );
};

interface TakeLoanVariables {
  mint: anchor.web3.PublicKey;
  offer: LoanOfferJson;
}

export const useTakeLoanMutation = (onSuccess: () => void) => {
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation<void, Error, TakeLoanVariables>(
    async (variables) => {
      if (anchorWallet) {
        return actions.takeLoan(
          connection,
          anchorWallet,
          variables.mint,
          variables.offer
        );
      }
      throw new Error("Not ready");
    },
    {
      onSuccess(_, variables) {
        removeLoanOffer(queryClient, variables.offer);
        removeOfferFromGroupedLoanOffers(queryClient, variables.offer);
        toast.success("Loan taken");
        onSuccess();
      },
      onError(err) {
        console.error(err);
        if (err instanceof Error) {
          toast.error("Error: " + err.message);
        }
      },
    }
  );
};

export const useCloseLoanOfferMutation = (onSuccess: () => void) => {
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation<void, Error, LoanOfferJson>(
    async (variables) => {
      if (anchorWallet) {
        return actions.closeOffer(connection, anchorWallet, variables);
      }
      throw new Error("Not ready");
    },
    {
      async onSuccess(_, variables) {
        removeLoanOffer(queryClient, variables);
        removeOfferFromGroupedLoanOffers(queryClient, variables);
        toast.success("Offer closed");
        onSuccess();
      },
      onError(err) {
        console.error(err);
        if (err instanceof Error) {
          toast.error("Error: " + err.message);
        }
      },
    }
  );
};

export const useGiveLoanMutation = (onSuccess: () => void) => {
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation<void, Error, LoanJson>(
    async (loan) => {
      if (anchorWallet) {
        const mint = new anchor.web3.PublicKey(loan.mint);
        const borrower = new anchor.web3.PublicKey(loan.borrower);
        return actions.giveLoan(connection, anchorWallet, mint, borrower);
      }
      throw new Error("Not ready");
    },
    {
      async onSuccess(_, variables) {
        if (anchorWallet?.publicKey) {
          const mint = new anchor.web3.PublicKey(variables.mint);
          const borrower = new anchor.web3.PublicKey(variables.borrower);
          const loanPda = await query.findLoanAddress(mint, borrower);

          removeLoanFromList(queryClient, loanPda.toBase58());
          updateLoan(queryClient, loanPda.toBase58(), {
            lender: anchorWallet.publicKey.toBase58(),
            startDate: utils.toHexString(Math.round(Date.now() / 1000)),
            state: LoanState.Active,
          });
        }

        toast.success("Loan given");
        onSuccess();
      },
      onError(err) {
        console.error(err);
        if (err instanceof Error) {
          toast.error("Error: " + err.message);
        }
      },
    }
  );
};

export const useCloseLoanMutation = (onSuccess: () => void) => {
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation<void, Error, LoanJson>(
    async (loan) => {
      if (anchorWallet) {
        const mint = new anchor.web3.PublicKey(loan.mint);

        const borrowerTokenAccount = await actions.getOrCreateTokenAccount(
          connection,
          wallet,
          mint
        );

        return actions.closeLoan(
          connection,
          anchorWallet,
          mint,
          borrowerTokenAccount
        );
      }
      throw new Error("Not ready");
    },
    {
      async onSuccess(_, variables) {
        const mint = new anchor.web3.PublicKey(variables.mint);
        const borrower = new anchor.web3.PublicKey(variables.borrower);
        const loanPda = await query.findLoanAddress(mint, borrower);

        removeLoanFromList(queryClient, loanPda.toBase58());
        updateLoan(queryClient, loanPda.toBase58(), {
          state: LoanState.Cancelled,
        });

        toast.success("Loan closed");
        onSuccess();
      },
      onError(err) {
        console.error(err);
        if (err instanceof Error) {
          toast.error("Error: " + err.message);
        }
      },
    }
  );
};

export const useRepossessMutation = (onSuccess: () => void) => {
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation<void, Error, LoanJson>(
    async (loan) => {
      if (anchorWallet && wallet.publicKey) {
        const mint = new anchor.web3.PublicKey(loan.mint);
        const borrower = new anchor.web3.PublicKey(loan.borrower);
        const lenderTokenAccount = await actions.getOrCreateTokenAccount(
          connection,
          wallet,
          mint
        );

        return actions.repossessCollateral(
          connection,
          anchorWallet,
          mint,
          borrower,
          lenderTokenAccount
        );
      }
      throw new Error("Not ready");
    },
    {
      onError(err) {
        console.error(err);
        if (err instanceof Error) {
          toast.error("Error: " + err.message);
        }
      },
      async onSuccess(_, variables) {
        const mint = new anchor.web3.PublicKey(variables.mint);
        const borrower = new anchor.web3.PublicKey(variables.borrower);
        const loanPda = await query.findLoanAddress(mint, borrower);

        removeLoanFromList(queryClient, loanPda.toBase58());
        updateLoan(queryClient, loanPda.toBase58(), {
          state: LoanState.Defaulted,
        });

        toast.success("NFT repossessed.", {
          duration: 5000,
        });
        onSuccess();
      },
    }
  );
};

export const useRepayLoanMutation = (onSuccess: () => void) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation<void, Error, LoanJson>(
    async (loan) => {
      if (anchorWallet && loan.lender) {
        const mint = new anchor.web3.PublicKey(loan.mint);
        const lender = new anchor.web3.PublicKey(loan.lender);
        const borrowerTokenAccount = await actions.getOrCreateTokenAccount(
          connection,
          wallet,
          mint
        );

        return actions.repayLoan(
          connection,
          anchorWallet,
          mint,
          lender,
          borrowerTokenAccount
        );
      }
      throw new Error("Not ready");
    },
    {
      onError(err) {
        console.error(err);
        if (err instanceof Error) {
          toast.error("Error: " + err.message);
        }
      },
      async onSuccess(_, variables) {
        const mint = new anchor.web3.PublicKey(variables.mint);
        const borrower = new anchor.web3.PublicKey(variables.borrower);
        const loadPda = await query.findLoanAddress(mint, borrower);

        await queryClient.invalidateQueries(["loans"]);

        updateLoan(queryClient, loadPda.toBase58(), {
          outstanding: BigInt(0).toString(16),
          state: LoanState.Repaid,
        });

        toast.success("Loan repaid. Your NFT has been unlocked.", {
          duration: 5000,
        });
        onSuccess();
      },
    }
  );
};

function removeLoanOffer(queryClient: QueryClient, loanOffer: LoanOfferJson) {
  const queryCache = queryClient.getQueryCache();
  const offerQueries = queryCache.findAll(["loan_offers", "all"], {
    exact: false,
  });
  offerQueries.forEach((query) => {
    queryClient.setQueryData<LoanJson[]>(query.queryKey, (loanOffers = []) =>
      loanOffers.filter((o) => o.address !== loanOffer.address)
    );
  });
}

function removeOfferFromGroupedLoanOffers(
  queryClient: QueryClient,
  loanOffer: LoanOfferJson
) {
  const queryCache = queryClient.getQueryCache();
  const groupedQueries = queryCache.findAll(["loan_offers", "grouped"], {
    exact: false,
  });
  groupedQueries.forEach((query) => {
    queryClient.setQueryData<GroupedLoanOfferJson[]>(
      query.queryKey,
      (groupedOffers = []) => {
        return groupedOffers
          .map((o) => {
            if (
              o.amount === loanOffer.amount &&
              o.duration === loanOffer.duration &&
              o.basisPoints === loanOffer.basisPoints &&
              o.Collection.address === loanOffer.Collection.address
            ) {
              if (o._count === 1) {
                return null;
              }

              return {
                ...o,
                _count: o._count - 1,
              };
            }
            return o;
          })
          .filter(utils.notNull);
      }
    );
  });
}

function updateLoan(
  queryClient: QueryClient,
  key: string,
  update: Partial<LoanJson>
) {
  queryClient.setQueryData<LoanJson | undefined>(["loan", key], (data) => {
    if (data) {
      return {
        ...data,
        ...update,
      };
    }
  });
}

function removeLoanFromList(queryClient: QueryClient, key: string) {
  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.findAll(["loans"], {
    exact: false,
  });

  queries.forEach((query) => {
    queryClient.setQueryData<LoanJson[]>(query.queryKey, (loans = []) =>
      loans.filter((o) => o.address !== key)
    );
  });
}
