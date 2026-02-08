import {
  ListContextProvider,
  ResourceContextProvider,
  useGetIdentity,
  useGetList,
  useList,
  useTranslate,
} from "ra-core";

import { TasksIterator } from "../tasks/TasksIterator";

export const TasksListFilter = ({
  title,
  filter,
}: {
  title: string;
  filter: any;
}) => {
  const { identity } = useGetIdentity();
  const translate = useTranslate();

  // PERFORMANCE FIX: Reduced from 100 to 10 tasks per filter
  // Dashboard shows 5 tasks initially, so 10 is more than enough
  // User can click "Load more" to fetch additional tasks if needed
  const {
    data: tasks,
    total,
    isPending,
  } = useGetList(
    "tasks",
    {
      pagination: { page: 1, perPage: 10 }, // Reduced from 100
      sort: { field: "due_date", order: "ASC" },
      filter: {
        ...filter,
        sales_id: identity?.id,
      },
    },
    { enabled: !!identity },
  );

  const listContext = useList({
    data: tasks,
    isPending,
    resource: "tasks",
    perPage: 5,
  });

  if (isPending || !tasks || !total) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
        {title}
      </p>
      <ResourceContextProvider value="tasks">
        <ListContextProvider value={listContext}>
          <TasksIterator showContact />
        </ListContextProvider>
      </ResourceContextProvider>
      {total > listContext.perPage && (
        <div className="flex justify-center">
          <a
            href="#"
            onClick={(e) => {
              listContext.setPerPage(listContext.perPage + 10);
              e.preventDefault();
            }}
            className="text-sm underline hover:no-underline"
          >
            {translate("crm.dashboard.load_more")}
          </a>
        </div>
      )}
    </div>
  );
};
