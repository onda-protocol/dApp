import { Th } from "@chakra-ui/react";
import { useRouter } from "next/router";

import { LoanJson } from "../../../common/types";
import { Col, ColumnHeader, ListingsTable, LTVHeader } from "../../table";
import { LoanRow, LoanSortCols, LoanSortState } from "./common";

export const LOAN_COLS: Readonly<Col<LoanSortCols>[]> = [
  { name: "asset", label: "Asset" },
  { name: "duration", label: "Duration", isNumeric: true },
  { name: "apy", label: "APY", isNumeric: true },
  { name: "ltv", label: "LTV", isNumeric: true },
  { name: "amount", label: "Amount", isNumeric: true },
] as const;

interface LoanListingsProps {
  heading: string;
  placeholderMessage: string;
  isLoading?: boolean;
  action?: React.ReactNode;
  loans?: LoanJson[];
  sortState: LoanSortState;
  onSort: (col: LoanSortCols) => void;
}

export const LoanListings = ({
  isLoading,
  heading,
  placeholderMessage,
  action = null,
  loans,
  sortState,
  onSort,
}: LoanListingsProps) => {
  const router = useRouter();

  return (
    <ListingsTable<LoanSortCols, LoanJson>
      isLoading={isLoading}
      heading={heading}
      placeholder={placeholderMessage}
      action={action}
      cols={LOAN_COLS}
      items={loans}
      renderCol={(col) => {
        if (col.name === "asset") {
          return <Th key={col.name}>{col.label}</Th>;
        }

        let label: React.ReactNode = col.label;

        if (col.name === "ltv") {
          label = <LTVHeader />;
        }

        return (
          <ColumnHeader
            key={col.name}
            isNumeric={col.isNumeric}
            direction={sortState[0] === col.name ? sortState[1] : undefined}
            onClick={() => onSort(col.name)}
          >
            {label}
          </ColumnHeader>
        );
      }}
      renderRow={(item) => (
        <LoanRow
          key={item.address}
          item={item}
          onClick={() => router.push(`/loans/item/${item.address}`)}
        />
      )}
    />
  );
};
