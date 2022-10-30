import { Badge, Box, Button, Flex, Skeleton, Text } from "@chakra-ui/react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { IoAlertCircle, IoCheckmark, IoLeaf } from "react-icons/io5";

import { HireStateEnum } from "../../common/types";
import { Hire } from "../../common/model";
import { useMetadataFileQuery } from "../../hooks/query";
import { useCollectionName } from "../../hooks/render";

interface CardProps {
  children: React.ReactNode;
  href?: string;
  uri: string;
  imageAlt: string;
  onClick?: () => void;
}

export const Card = ({ children, href, uri, imageAlt, onClick }: CardProps) => {
  const [isVisible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement & HTMLAnchorElement>(null);

  const metadataQuery = useMetadataFileQuery(uri);

  const card = (
    <Box
      as={href ? "a" : "div"}
      w={{
        base: "calc(50% - 0.625rem)",
        md: "calc(33.333% - 0.833rem)",
        lg: "calc(25% - 0.937rem)",
        // xl: "calc(20% - 1rem)",
      }}
      borderWidth="1px"
      borderColor="gray.800"
      borderRadius="md"
      cursor={href || onClick ? "pointer" : undefined}
      overflow="hidden"
      tabIndex={1}
      ref={containerRef}
      _focus={{
        boxShadow: href || onClick ? "lg" : undefined,
      }}
      _hover={{
        boxShadow: href || onClick ? "md" : undefined,
        transform: href || onClick ? "scale(1.02)" : undefined,
      }}
      transition="box-shadow 0.2s ease-in, transform 0.2s ease-in-out"
      onClick={onClick}
      role={onClick ? "button" : "link"}
    >
      <Box position="relative" width="100%" pb="80%">
        <Box position="absolute" left="0" top="0" right="0" bottom="0">
          <Skeleton
            height="100%"
            width="100%"
            isLoaded={metadataQuery.data?.image && isVisible}
          >
            {metadataQuery.data?.image && (
              <Image
                quality={100}
                layout="fill"
                objectFit="cover"
                src={metadataQuery.data?.image}
                alt={imageAlt}
                onLoad={() => setVisible(true)}
              />
            )}
          </Skeleton>
        </Box>
      </Box>

      {children}
    </Box>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }

  return card;
};

interface CardListProps {
  children: React.ReactNode;
}

export const CardList = ({ children }: CardListProps) => {
  return (
    <Flex flexDirection="row" wrap="wrap" gap="1.25rem" mb="12">
      {children}
    </Flex>
  );
};

interface RentalCardProps {
  rental: Hire;
  onRent?: () => void;
}

export const RentalCard = ({ rental, onRent }: RentalCardProps) => {
  const collection = useCollectionName(rental.metadata);

  function renderBadge() {
    switch (rental.state) {
      case HireStateEnum.Listed: {
        return null;
      }

      default: {
        if (rental.expired) {
          return (
            <Badge borderRadius="full" px="1" py="1" mr="2">
              <IoAlertCircle />
            </Badge>
          );
        }

        if (rental.currentPeriodExpired) {
          return (
            <Badge borderRadius="full" px="1" py="1" mr="2">
              <IoLeaf />
            </Badge>
          );
        }

        return (
          <Badge borderRadius="full" px="1" py="1" mr="2">
            <IoCheckmark />
          </Badge>
        );
      }
    }
  }

  return (
    <Card
      href={`/rentals/${rental.address}`}
      uri={rental.metadata.data.uri}
      imageAlt={rental.metadata.data.name}
    >
      <Box p="4">
        <Box display="flex" alignItems="center">
          {renderBadge()}
        </Box>
        <Box mt="1" mb="2">
          <Text
            fontSize="sm"
            fontWeight="medium"
            as="h5"
            lineHeight="tight"
            isTruncated
          >
            {rental.metadata.data.name}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {collection}
          </Text>
        </Box>
        <Box display="flex" letterSpacing="wide" fontSize="xs">
          <Text fontWeight="semibold">{rental.amount} / day</Text>
          &nbsp;&nbsp;•&nbsp;&nbsp;
          <Text color="gray.500">max {rental.maxDays} days</Text>
        </Box>
        {onRent && (
          <Box display="flex" justifyContent="flex-end" mt="4">
            <Button size="sm" variant="outline">
              Rent
            </Button>
          </Box>
        )}
      </Box>
    </Card>
  );
};
