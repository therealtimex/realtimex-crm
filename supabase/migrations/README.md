# Database Migrations

This directory contains all the SQL migration files needed to set up the RealTimeX CRM database schema.

## Quick Setup (Recommended)

The easiest way to set up your database is to use the combined `setup.sql` file:

1. Download [setup.sql](https://raw.githubusercontent.com/therealtimex/realtimex-crm/main/public/setup.sql)
2. Open your [Supabase SQL Editor](https://supabase.com/dashboard)
3. Copy the entire contents of `setup.sql` and paste into the SQL Editor
4. Click "Run" to execute all migrations at once

## Using Supabase CLI

If you prefer using the CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Clone this repository
git clone https://github.com/therealtimex/realtimex-crm.git
cd realtimex-crm

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## Migration Files

These migrations are applied in chronological order (by date in filename):

1. **20240730075029_init_db.sql** - Creates core tables (contacts, companies, deals, sales, tasks, tags)
2. **20240730075425_init_triggers.sql** - Sets up user sync triggers between auth.users and sales table
3. **20240806124555_task_sales_id.sql** - Adds sales_id to tasks table
4. **20240807082449_remove-aquisition.sql** - Removes deprecated acquisition field
5. **20240808141826_init_state_configure.sql** - Creates init_state table for tracking initialization
6. **20240813084010_tags_policy.sql** - Adds RLS policies for tags table
7. **20241104153231_sales_policies.sql** - Adds RLS policies for sales table
8. **20250109152531_email_jsonb.sql** - Migrates email to JSONB format for multiple emails
9. **20250113132531_phone_jsonb.sql** - Migrates phone to JSONB format for multiple phones
10. **20251204172855_merge_contacts_function.sql** - Adds contact merging functionality
11. **20251204201317_drop_merge_contacts_function.sql** - Refactors merge function

## What Gets Created

After running migrations, your database will have:

### Tables
- `contacts` - Contact information with JSONB email/phone support
- `companies` - Company records with logo support
- `deals` - Deal pipeline with stages and amounts
- `contactNotes` - Notes attached to contacts
- `dealNotes` - Notes attached to deals
- `tasks` - Task management
- `sales` - CRM users (synced with auth.users)
- `tags` - Tagging system
- `init_state` - Initialization tracking

### Views
- `contacts_summary` - Aggregated contact data with task counts
- `companies_summary` - Aggregated company data

### Functions
- `handle_new_user()` - Auto-creates sales record when user signs up
- `handle_update_user()` - Syncs user metadata updates
- Edge functions for user management, email processing, contact merging

### Row Level Security (RLS)
All tables have RLS enabled with policies that:
- Currently use permissive policies (`using (true)`) for all authenticated users
- Track ownership via `sales_id` foreign keys
- Can be made restrictive for data isolation (see migration files for examples)

## Regenerating setup.sql

If you modify any migration files, regenerate the combined setup.sql:

```bash
npm run setup:gen
```

## Troubleshooting

If migrations fail:
1. Check that your Supabase project is active and accessible
2. Ensure you have sufficient permissions (project owner)
3. Try running migrations one by one to identify the problematic migration
4. Check Supabase logs for detailed error messages

For help, see:
- [RealTimeX CRM Documentation](https://github.com/therealtimex/realtimex-crm#readme)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Report an Issue](https://github.com/therealtimex/realtimex-crm/issues)
