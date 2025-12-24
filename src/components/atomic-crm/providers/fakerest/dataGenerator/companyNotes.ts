import { datatype, lorem, random } from "faker/locale/en_US";

import type { CompanyNote } from "../../../types";
import type { Db } from "./types";
import { randomDate } from "./utils";

export const generateCompanyNotes = (db: Db): CompanyNote[] => {
  return Array.from(Array(600).keys()).map((id) => {
    const company = random.arrayElement(db.companies);
    const date = randomDate(new Date(company.created_at));

    return {
      id,
      company_id: company.id,
      text: lorem.paragraphs(datatype.number({ min: 1, max: 4 })),
      date: date.toISOString(),
      sales_id: company.sales_id,
    };
  });
};
