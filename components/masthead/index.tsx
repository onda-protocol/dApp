import { Badge, Box, Button, Heading, Text } from "@chakra-ui/react";
import Link from "next/link";

export function Masthead() {
  return (
    <Box pt="8" pb="20">
      <Heading
        as="h1"
        size="2xl"
        color="gray.700"
        lineHeight="shorter"
        fontWeight="extrabold"
        maxW="16ch"
        mb="6"
      >
        <Box as="span" color="green.600">
          Borrow and lend
        </Box>{" "}
        against non-fungibles
      </Heading>
      <Text color="gray.600" size="md" fontWeight="medium" mb="8">
        Unlock the value of your NFTs with free and secure lending.
        <br />
        <Badge colorScheme="green">Liquidity pools coming soon!</Badge>
      </Text>
      <Box>
        <Link href="/manage">
          <Button as="a" colorScheme="green" cursor="pointer">
            Get Started Today
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
