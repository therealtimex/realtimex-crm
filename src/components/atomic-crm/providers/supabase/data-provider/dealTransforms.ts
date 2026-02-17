import type { Identifier } from "ra-core";

import type { Deal } from "../../../types";

export const buildUnarchiveDealsPayload = (
  deals: Deal[],
  unarchivedDealId: Identifier,
): Deal[] => {
  return deals.map((deal, index) => ({
    ...deal,
    index: deal.id === unarchivedDealId ? 0 : index + 1,
    archived_at: deal.id === unarchivedDealId ? null : deal.archived_at,
  }));
};
