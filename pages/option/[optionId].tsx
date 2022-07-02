import * as anchor from "@project-serum/anchor";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Badge,
  Button,
  Container,
  Heading,
  Flex,
  Box,
  Tag,
  TagLeftIcon,
  TagLabel,
  Text,
} from "@chakra-ui/react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { IoLeaf, IoAlert } from "react-icons/io5";

import { RPC_ENDPOINT, CallOptionState } from "../../common/constants";
import { CallOptionResult } from "../../common/types";
import { CallOption, CallOptionPretty } from "../../common/model";
import { fetchCallOption } from "../../common/query";
import { useCallOptionQuery, useFloorPriceQuery } from "../../hooks/query";
import {
  useBuyCallOptionMutation,
  useCloseCallOptionMutation,
  useExerciseCallOptionMutation,
} from "../../hooks/mutation";
import {
  BuyCallOptionDialog,
  ExerciseDialog,
  CloseCallOptionDialog,
} from "../../components/dialog";
import { Activity } from "../../components/activity";
import { ExternalLinks } from "../../components/link";
import { ListingImage } from "../../components/image";
import { VerifiedCollection } from "../../components/collection";
import { EllipsisProgress } from "../../components/progress";

interface CallOptionProps {
  initialData: {
    callOption: CallOptionPretty;
    jsonMetadata: any;
  } | null;
}

const CallOptionPage: NextPage<CallOptionProps> = (props) => {
  return (
    <>
      <CallOptionHead />
      <CallOptionLayout />
    </>
  );
};

CallOptionPage.getInitialProps = async (ctx) => {
  if (typeof window === "undefined") {
    try {
      const connection = new anchor.web3.Connection(RPC_ENDPOINT);
      const pubkey = new anchor.web3.PublicKey(ctx.query.optionId as string);
      const callOption = await fetchCallOption(connection, pubkey);
      const jsonMetadata = await fetch(callOption.metadata.data.uri).then(
        (response) => {
          return response.json().then((data) => data);
        }
      );

      return {
        initialData: {
          callOption: callOption.pretty(),
          jsonMetadata,
        },
      };
    } catch (err) {
      console.log(err);
    }
  }

  return {
    initialData: null,
    meta: null,
  };
};

function usePageParam() {
  const router = useRouter();
  return useMemo(
    () => new anchor.web3.PublicKey(router.query.optionId as string),
    [router]
  );
}

const CallOptionHead = () => {
  const callOptionAddress = usePageParam();
  const callOptionQueryResult = useCallOptionQuery(callOptionAddress);
  const callOptionPretty = callOptionQueryResult.data;

  if (!callOptionPretty) {
    return null;
  }

  const description = `Call Option with strike price ${callOption.strikePrice} expiring ${callOption.expiry}`;

  return (
    <Head>
      <title>{callOption.metadata.data.name}</title>
      <meta name="description" content={description} />
      <meta name="author" content="Dexloan" />
      <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico"></link>
      <link rel="icon" type="image/png" sizes="192x192" href="/logo192.png" />

      <meta property="og:title" content={callOption.metadata.data.name} />
      <meta property="og:type" content="website" />
      <meta property="og:description" content={description} />
      <meta
        property="og:url"
        content={`https://dexloan.io/option/${callOption.publicKey.toBase58()}`}
      />
      <meta property="og:image" content={initialData.jsonMetadata.image} />

      <meta property="twitter:title" content={initialData.jsonMetadata.name} />
      <meta property="twitter:description" content={description} />
      <meta
        property="twitter:url"
        content={`https://dexloan.io/option/${callOption.publicKey.toBase58()}`}
      />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:image" content={initialData.jsonMetadata.image} />
      <meta
        property="twitter:image:alt"
        content={initialData.jsonMetadata.name}
      />
      <meta property="twitter:label1" content="Strke Price" />
      <meta property="twitter:data1" content={callOption.strikePrice} />
      <meta property="twitter:label2" content="Cost" />
      <meta property="twitter:data2" content={callOption.cost} />
      <meta property="twitter:label3" content="Expiry" />
      <meta property="twitter:data3" content={callOption.expiry} />
    </Head>
  );
};

const CallOptionLayout = () => {
  const router = useRouter();
  const anchorWallet = useAnchorWallet();

  const callOptionAddress = new anchor.web3.PublicKey(
    router.query.optionId as string
  );

  const callOptionQueryResult = useCallOptionQuery(callOptionAddress);

  const symbol = callOptionQueryResult.data?.metadata?.data.symbol;
  const floorPriceQuery = useFloorPriceQuery(symbol);

  const callOption = callOptionQueryResult.data;
  const metadata = callOption?.metadata;

  const isSeller = callOption?.seller === anchorWallet?.publicKey.toBase58();
  const isBuyer = callOption?.buyer === anchorWallet?.publicKey.toBase58();

  function renderActiveButton() {
    if (!callOption?.expired && callOptionQueryResult.data && isBuyer) {
      return <ExerciseButton callOption={callOptionQueryResult.data} />;
    }

    return null;
  }

  function renderListedButton() {
    if (callOptionQueryResult.data && isSeller) {
      return <CloseButton callOption={callOptionQueryResult.data} />;
    } else if (callOptionQueryResult.data) {
      return <BuyButton callOption={callOptionQueryResult.data} />;
    }
    return null;
  }

  function renderCloseAccountButton() {
    if (callOptionQueryResult.data && isSeller) {
      // TODO is this needed?
      return <CloseButton callOption={callOptionQueryResult.data} />;
    }

    return null;
  }

  function renderProfitability() {
    if (callOption?.strikePrice && floorPriceQuery.data?.floorPrice) {
      const percentage = Number(
        (callOption.data.strikePrice.toNumber() /
          floorPriceQuery.data.floorPrice) *
          100
      ).toFixed(2);
      return percentage + "%";
    }

    return <EllipsisProgress />;
  }

  function renderByState() {
    if (callOption === undefined) return null;

    switch (callOption.data.state) {
      case CallOptionState.Listed:
        return (
          <Box mt="4" mb="4">
            {renderListedButton()}
          </Box>
        );

      case CallOptionState.Active:
        return (
          <>
            <Box display="flex" pb="4">
              {callOption?.expired ? (
                <Tag colorScheme="red" ml="2">
                  <TagLeftIcon boxSize="12px" as={IoAlert} />
                  <TagLabel>Expired</TagLabel>
                </Tag>
              ) : (
                <Tag colorScheme="green">
                  <TagLeftIcon boxSize="12px" as={IoLeaf} />
                  <TagLabel>Active</TagLabel>
                </Tag>
              )}
            </Box>
            <Box mt="4" mb="4">
              {renderActiveButton()}
            </Box>
          </>
        );

      case CallOptionState.Exercised:
        return (
          <>
            <Box p="4" borderRadius="lg" bgColor="blue.50" mb="4">
              <Text>
                Listing has ended. The call option was exercised by the buyer.
              </Text>
            </Box>
            <Box marginY="size-200">{renderCloseAccountButton()}</Box>
          </>
        );

      default:
        return null;
    }
  }

  if (callOptionQueryResult.isLoading) {
    // TODO skeleton
    return null;
  }

  if (callOptionQueryResult.error instanceof Error) {
    return (
      <Container maxW="container.lg">
        <Box mt="2">
          <Flex direction="column" alignItems="center">
            <Heading size="xl" fontWeight="black" mt="6" mb="6">
              404 Error
            </Heading>
            <Text fontSize="lg">{callOptionQueryResult.error.message}</Text>
          </Flex>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW={{ md: "container.md", lg: "container.xl" }}>
      <Flex
        direction={{
          base: "column",
          lg: "row",
        }}
        align={{
          base: "center",
          lg: "flex-start",
        }}
        wrap="wrap"
      >
        <Box w={{ base: "100%", lg: "auto" }} maxW={{ base: "xl", lg: "100%" }}>
          <ListingImage uri={metadata?.data.uri} />
          <ExternalLinks mint={callOption?.data.mint} />
        </Box>
        <Box flex={1} width="100%" maxW="xl" pl={{ lg: "12" }} mt="6">
          <Badge colorScheme="green" mb="2">
            Peer-to-peer Listing
          </Badge>
          <Heading as="h1" size="lg" color="gray.700" fontWeight="black">
            {metadata?.data.name}
          </Heading>
          <Box mb="8">
            <VerifiedCollection symbol={metadata?.data.symbol} />
          </Box>

          {callOption && (
            <>
              <Flex direction="row" gap="12" mt="12">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.500">
                    Cost
                  </Text>
                  <Heading size="md" fontWeight="bold" mb="6">
                    {callOption.cost}
                  </Heading>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.500">
                    Expires
                  </Text>
                  <Heading size="md" fontWeight="bold" mb="6">
                    {callOption.expiry}
                  </Heading>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color="gray.500">
                    Strike Price
                  </Text>
                  <Heading size="md" fontWeight="bold" mb="6">
                    {callOption.strikePrice}
                  </Heading>
                </Box>
              </Flex>
            </>
          )}

          {renderByState()}

          <Activity mint={callOption?.data.mint} />
        </Box>
      </Flex>
    </Container>
  );
};

interface BuyButtonProps {
  callOption: CallOptionResult;
}

const BuyButton = ({ callOption }: BuyButtonProps) => {
  const [open, setDialog] = useState(false);
  const mutation = useBuyCallOptionMutation(() => setDialog(false));
  const anchorWallet = useAnchorWallet();
  const { setVisible } = useWalletModal();

  async function onLend() {
    if (anchorWallet) {
      setDialog(true);
    } else {
      setVisible(true);
    }
  }

  return (
    <>
      <Button colorScheme="green" w="100%" onClick={onLend}>
        Lend SOL
      </Button>
      <BuyCallOptionDialog
        open={open}
        loading={mutation.isLoading}
        callOption={callOption}
        onRequestClose={() => setDialog(false)}
        onConfirm={() => mutation.mutate(callOption.data)}
      />
    </>
  );
};

interface CloseButtonProps {
  callOption: CallOptionResult;
}

const CloseButton = ({ callOption }: CloseButtonProps) => {
  const [dialog, setDialog] = useState(false);
  const mutation = useCloseCallOptionMutation(() => setDialog(false));
  const anchorWallet = useAnchorWallet();
  const { setVisible } = useWalletModal();

  async function onCancel() {
    if (anchorWallet) {
      setDialog(true);
    } else {
      setVisible(true);
    }
  }

  return (
    <>
      <Button colorScheme="blue" w="100%" onClick={onCancel}>
        Close Option
      </Button>
      <CloseCallOptionDialog
        open={dialog}
        loading={mutation.isLoading}
        callOption={callOption}
        onRequestClose={() => setDialog(false)}
        onConfirm={() => mutation.mutate(callOption.data)}
      />
    </>
  );
};

interface ExerciseButtonProps {
  callOption: CallOptionResult;
}

const ExerciseButton = ({ callOption }: ExerciseButtonProps) => {
  const router = useRouter();
  const [dialog, setDialog] = useState(false);
  const mutation = useExerciseCallOptionMutation(() => setDialog(false));
  const anchorWallet = useAnchorWallet();
  const { setVisible } = useWalletModal();

  async function onRepay() {
    if (anchorWallet) {
      setDialog(true);
    } else {
      setVisible(true);
    }
  }

  useEffect(() => {
    if (mutation.isSuccess) {
      router.replace("/manage");
    }
  }, [router, mutation.isSuccess]);

  return (
    <>
      <Button colorScheme="blue" w="100%" onClick={onRepay}>
        Exercise Call Option
      </Button>
      <ExerciseDialog
        open={dialog}
        loading={mutation.isLoading}
        callOption={callOption}
        onRequestClose={() => setDialog(false)}
        onConfirm={() => mutation.mutate(callOption.data)}
      />
    </>
  );
};

export default CallOptionPage;
