import type { NextApiRequest, NextApiResponse } from "next";
import * as utils from "../../../../common/utils";
import prisma from "../../../../common/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const result = await prisma.collection.findUnique({
    where: {
      mint: req.query.mint as string | undefined,
    },
  });

  res.json(utils.parseBigInts(result));
}
