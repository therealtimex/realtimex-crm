import { lorem } from "faker/locale/en_US";
import type { TaskNote } from "../../../types";
import type { Db } from "./types";
import { randomDate } from "./utils";

export const generateTaskNotes = (db: Db): TaskNote[] => {
  const taskNotes: TaskNote[] = [];
  let id = 0;

  db.tasks.forEach((task) => {
    // Generate 0-3 notes per task
    const noteCount = Math.floor(Math.random() * 4);
    for (let i = 0; i < noteCount; i++) {
        const date = randomDate(new Date(task.created_at || new Date()));
        taskNotes.push({
            id: id++,
            task_id: task.id,
            text: lorem.paragraph(),
            date: date.toISOString(),
            sales_id: task.sales_id || db.sales[0].id,
            status: ["cold", "warm", "hot"][Math.floor(Math.random() * 3)],
            created_at: date.toISOString(),
            updated_at: date.toISOString(),
        });
    }
  });

  return taskNotes;
};
