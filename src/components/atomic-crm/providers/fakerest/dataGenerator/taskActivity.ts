import { datatype, random } from "faker/locale/en_US";
import type { TaskActivity } from "../../../types";
import type { Db } from "./types";
import { randomDate } from "./utils";

export const generateTaskActivity = (db: Db): TaskActivity[] => {
  const activities: TaskActivity[] = [];
  const actionsPool = ['updated', 'assigned', 'completed', 'reopened'];
  const fieldsPool = ['text', 'priority', 'status', 'due_date'];
  let id = 0;

  db.tasks.forEach((task) => {
    // Always create "created" activity
    const createdAt = task.created_at || new Date().toISOString();
    
    activities.push({
      id: id++,
      task_id: task.id,
      sales_id: task.sales_id || db.sales[0].id,
      action: 'created',
      field_name: undefined,
      old_value: undefined,
      new_value: undefined,
      created_at: createdAt,
    });

    // Generate 1-5 random activities per task
    const activityCount = datatype.number({min: 1, max: 5});
    for (let i = 0; i < activityCount; i++) {
      const action = random.arrayElement(actionsPool);
      const field = action === 'updated' ? random.arrayElement(fieldsPool) : undefined;
      const date = randomDate(new Date(createdAt));

      activities.push({
        id: id++,
        task_id: task.id,
        sales_id: random.arrayElement(db.sales).id,
        action,
        field_name: field,
        old_value: field ? 'medium' : undefined,
        new_value: field ? 'high' : undefined,
        created_at: date.toISOString(),
      });
    }

    // Add "completed" activity if task is done
    if (task.done_date) {
      activities.push({
        id: id++,
        task_id: task.id,
        sales_id: task.sales_id || db.sales[0].id,
        action: 'completed',
        field_name: undefined,
        old_value: undefined,
        new_value: undefined,
        created_at: task.done_date,
      });
    }
  });

  return activities;
};
