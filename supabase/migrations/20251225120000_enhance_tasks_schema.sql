-- 1.1 Task Notes Table
CREATE TABLE IF NOT EXISTS public."taskNotes" (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id bigint NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    text text NOT NULL,
    date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    sales_id bigint NOT NULL REFERENCES public.sales(id),
    status text DEFAULT 'cold'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_taskNotes_task_id ON public."taskNotes"(task_id);
CREATE INDEX IF NOT EXISTS idx_taskNotes_sales_id ON public."taskNotes"(sales_id);
CREATE INDEX IF NOT EXISTS idx_taskNotes_date ON public."taskNotes"(date DESC);
CREATE INDEX IF NOT EXISTS idx_taskNotes_task_id_date ON public."taskNotes"(task_id, date DESC);

ALTER TABLE public."taskNotes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public."taskNotes"
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public."taskNotes"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public."taskNotes"
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public."taskNotes"
    FOR DELETE USING (auth.role() = 'authenticated');

-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_taskNotes_updated_at
    BEFORE UPDATE ON public."taskNotes"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 1.2 Enhanced Tasks Table
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS assigned_to bigint REFERENCES public.sales(id),
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'todo',
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

COMMENT ON COLUMN public.tasks.priority IS 'Task priority: low, medium, high, urgent';
COMMENT ON COLUMN public.tasks.assigned_to IS 'Sales person assigned to task (nullable for unassigned tasks)';
COMMENT ON COLUMN public.tasks.status IS 'Task status: todo, in_progress, blocked, done, cancelled';

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing tasks
UPDATE public.tasks
SET status = CASE
    WHEN done_date IS NOT NULL THEN 'done'
    ELSE 'todo'
END
WHERE status IS NULL OR status = 'todo';

UPDATE public.tasks
SET assigned_to = sales_id
WHERE assigned_to IS NULL AND sales_id IS NOT NULL;

-- 1.4 Task Activity Log
CREATE TABLE IF NOT EXISTS public.task_activity (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id bigint NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    sales_id bigint NOT NULL REFERENCES public.sales(id),
    action text NOT NULL,
    field_name text,
    old_value text,
    new_value text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON public.task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_sales_id ON public.task_activity(sales_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created_at ON public.task_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activity_task_created ON public.task_activity(task_id, created_at DESC);

COMMENT ON COLUMN public.task_activity.action IS 'Action performed: created, updated, assigned, completed, deleted, duplicated, archived';

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.task_activity
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.task_activity
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 1.5 Task Archiving Columns
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_tasks_archived ON public.tasks(archived, archived_at);
