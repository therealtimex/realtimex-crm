import type {
  Company,
  CompanyNote,
  Contact,
  ContactNote,
  Deal,
  DealNote,
  Sale,
  Tag,
  Task,
} from "../../../types";

export interface Db {
  companies: Required<Company>[];
  companyNotes: CompanyNote[];
  contacts: Required<Contact>[];
  contactNotes: ContactNote[];
  deals: Deal[];
  dealNotes: DealNote[];
  sales: Sale[];
  tags: Tag[];
  tasks: Task[];
}
