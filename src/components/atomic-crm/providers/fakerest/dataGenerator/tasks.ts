import { datatype, lorem, random } from "faker/locale/en_US";

import { defaultTaskTypes } from "../../../root/defaultConfiguration";
import type { Task } from "../../../types";
import type { Db } from "./types";
import { randomDate } from "./utils";

type TaskType = (typeof defaultTaskTypes)[number];

export const type: TaskType[] = [
  "Email",
  "Email",
  "Email",
  "Email",
  "Email",
  "Email",
  "Call",
  "Call",
  "Call",
  "Call",
  "Call",
  "Call",
  "Call",
  "Call",
  "Call",
  "Call",
  "Call",
  "Demo",
  "Lunch",
  "Meeting",
  "Follow-up",
  "Follow-up",
  "Thank you",
  "Ship",
  "None",
];

export const generateTasks = (db: Db) => {
  return Array.from(Array(400).keys()).map<any>((id) => {
    const contact = random.arrayElement(db.contacts);
    const company = db.companies.find((c) => c.id === contact.company_id);
    const creator = db.sales.find((s) => s.id === contact.sales_id);
    contact.nb_tasks++;
    
    const createdDate = randomDate(new Date(contact.first_seen)).toISOString();
    const dueDate = randomDate(
      datatype.boolean() ? new Date() : new Date(contact.first_seen),
      new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    ).toISOString();
    
    const isDone = datatype.boolean();
    const doneDate = isDone ? randomDate(new Date(createdDate)).toISOString() : undefined;
    
    return {
      id,
      contact_id: contact.id,
      type: random.arrayElement(defaultTaskTypes),
      text: lorem.sentence(),
      due_date: dueDate,
      done_date: doneDate,
      sales_id: contact.sales_id,
      priority: random.arrayElement(["low", "medium", "high", "urgent"]),
      assigned_to: contact.sales_id,
      status: isDone ? "done" : "todo",
      created_at: createdDate,
      updated_at: createdDate,
      archived: false,
      
      // Denormalized fields for TaskSummary simulation
      contact_first_name: contact.first_name,
      contact_last_name: contact.last_name,
      contact_email: contact.email_jsonb?.[0]?.email,
      company_id: contact.company_id,
      company_name: company?.name,
      creator_first_name: creator?.first_name,
      creator_last_name: creator?.last_name,
      assigned_first_name: creator?.first_name,
      assigned_last_name: creator?.last_name,
    };
  });
};
