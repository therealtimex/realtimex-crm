import {
  company as fakerCompany,
  internet,
  lorem,
  name,
  phone,
  random,
  date,
  datatype,
} from "faker/locale/en_US";

import {
  defaultContactGender,
  defaultNoteStatuses,
} from "../../../root/defaultConfiguration";
import type { Company, Contact } from "../../../types";
import type { Db } from "./types";
import { randomDate, weightedBoolean } from "./utils";

const maxContacts = {
  1: 1,
  10: 4,
  50: 12,
  250: 25,
  500: 50,
};

const getRandomContactDetailsType = () =>
  random.arrayElement(["Work", "Home", "Other"]) as "Work" | "Home" | "Other";

export const generateContacts = (db: Db, size = 500): Required<Contact>[] => {
  const nbAvailblePictures = 223;
  let numberOfContacts = 0;

  return Array.from(Array(size).keys()).map((id) => {
    const has_avatar =
      weightedBoolean(25) && numberOfContacts < nbAvailblePictures;
    const gender = random.arrayElement(defaultContactGender).value;
    const first_name = name.firstName(gender as any);
    const last_name = name.lastName();
    const email_jsonb = [
      {
        email: internet.email(first_name, last_name),
        type: getRandomContactDetailsType(),
      },
    ];
    const phone_jsonb = [
      {
        number: phone.phoneNumber(),
        type: getRandomContactDetailsType(),
      },
      {
        number: phone.phoneNumber(),
        type: getRandomContactDetailsType(),
      },
    ];
    const avatar = {
      src: has_avatar
        ? "https://marmelab.com/posters/avatar-" +
          (223 - numberOfContacts) +
          ".jpeg"
        : undefined,
    };
    const title = fakerCompany.bsAdjective();

    if (has_avatar) {
      numberOfContacts++;
    }

    // choose company with people left to know
    let company: Required<Company>;
    do {
      company = random.arrayElement(db.companies);
    } while (company.nb_contacts >= maxContacts[company.size]);
    company.nb_contacts++;

    const first_seen = randomDate(new Date(company.created_at)).toISOString();
    const last_seen = first_seen;

    // Heartbeat generation
    const daysInactive = datatype.number({ min: 0, max: 365 });
    
    const computeScore = (days: number): number => {
      if (days <= 7) return datatype.number({ min: 80, max: 100 });
      if (days <= 30) return datatype.number({ min: 60, max: 79 });
      if (days <= 90) return datatype.number({ min: 40, max: 59 });
      if (days <= 180) return datatype.number({ min: 20, max: 39 });
      return datatype.number({ min: 0, max: 19 });
    };

    const score = computeScore(daysInactive);
    
    // Internal heartbeat (70% populated)
    const internalHeartbeat = Math.random() > 0.3 ? {
      internal_heartbeat_score: score,
      internal_heartbeat_status:
        score >= 80 ? 'strong' :
        score >= 60 ? 'active' :
        score >= 40 ? 'cooling' :
        score >= 20 ? 'cold' : 'dormant',
      internal_heartbeat_updated_at: date.recent(7).toISOString(),
    } : {};

    // External heartbeat (50% populated)
    const externalHeartbeat = Math.random() > 0.5 ? {
      external_heartbeat_status: random.arrayElement(['valid', 'warning', 'invalid', 'unknown']),
      external_heartbeat_checked_at: date.recent(30).toISOString(),
      email_validation_status: random.arrayElement(['valid', 'risky', 'invalid', 'unknown']),
      linkedin_profile_status: random.arrayElement(['active', 'inactive', 'not_found', 'unknown']),
    } : {};

    return {
      id,
      first_name,
      last_name,
      gender,
      title: title.charAt(0).toUpperCase() + title.substr(1),
      company_id: company.id,
      company_name: company.name,
      email_jsonb,
      phone_jsonb,
      background: lorem.sentence(),
      acquisition: random.arrayElement(["inbound", "outbound"]),
      avatar,
      first_seen: first_seen,
      last_seen: last_seen,
      has_newsletter: weightedBoolean(30),
      status: random.arrayElement(defaultNoteStatuses).value,
      tags: random
        .arrayElements(db.tags, random.arrayElement([0, 0, 0, 1, 1, 2]))
        .map((tag) => tag.id), // finalize
      sales_id: company.sales_id,
      nb_tasks: 0,
      linkedin_url: null,
      ...internalHeartbeat,
      ...externalHeartbeat,
      days_since_last_activity: daysInactive,
    };
  });
};
