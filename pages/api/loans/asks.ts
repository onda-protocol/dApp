import type { NextApiRequest, NextApiResponse } from "next";
import * as utils from "../../../common/utils";
import { LoanState } from "@prisma/client";
import prisma from "../../../common/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    state,
    collectionAddress,
    orderBy = "amount",
    sortOrder = "desc",
  } = req.query;

  const result = await prisma.loan.findMany({
    where: {
      state: typeof state === "string" ? (state as LoanState) : undefined,
      collectionAddress: {
        in: collectionAddress,
      },
    },
    include: {
      Collection: true,
    },
    orderBy: {
      [orderBy as string]: sortOrder,
    },
  });

  res.json(utils.parseBitInts(result));
}
