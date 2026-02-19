# APIs and Hooks in RealTimeX CRM

  🎣 Custom React Hooks

  UI & Utilities
  - useIsMobile() - Detect mobile viewport (< 768px)
  - useAppBarHeight() - Get app bar height (48px desktop, 64px mobile)
  - usePapaParse() - Parse CSV files in batches with progress tracking

  Data Import/Export
  - useContactImport() - Import contacts from CSV with company/tag resolution
  - useBulkExport() - Export selected records with related data

  Form Helpers
  - useSupportCreateSuggestion() - Inline creation in select/autocomplete fields
  - useCreateSuggestionContext() - Access suggestion creation context
  - useSimpleFormIterator() - Array form field management (add/remove/reorder)
  - useSimpleFormIteratorItem() - Individual array item context

  Context Hooks
  - useSavedQueries(resource) - Store/retrieve saved filters per resource
  - useUserMenu() - Control user menu visibility
  - useActivityLogContext() - Get activity log filter scope
  - useConfigurationContext() - Access CRM configuration (branding, stages, etc.)

  🔌 React-Admin Core Hooks

  Data Fetching
  - useDataProvider(), useGetList(), useGetOne(), useGetMany(), useGetManyReference(), useList()

  Mutations
  - useCreate(), useUpdate(), useDelete(), useDeleteWithUndoController(), useBulkDeleteController()

  Forms
  - useInput(), useForm(), useFormState(), useChoices(), useFieldValue()

  Context
  - useListContext(), useRecordContext(), useResourceContext(), useEditContext(), useShowContext(),
  useCreateContext()

  Utilities
  - useTranslate(), useNotify(), useRedirect(), useRefresh(), useStore()

  Auth
  - useGetIdentity(), useLogin(), useLogout(), useHandleAuthCallback()

  🚀 Supabase Edge Functions (API Endpoints)

  User Management - /functions/users
  - POST - Create/invite user (admin only)
  - PATCH - Update user profile

  Password - /functions/updatePassword
  - PATCH - Send password reset email

  Contact Management - /functions/mergeContacts
  - POST - Merge two contacts (transfers tasks, notes, deals)

  Email Integration - /functions/postmark
  - POST - Process inbound email webhook (creates contact notes)

  📊 Data Provider APIs

  Standard Methods
  getList(resource, params) => { data: T[], total: number }
  getOne(resource, params) => { data: T }
  getMany(resource, params) => { data: T[] }
  getManyReference(resource, params) => { data: T[], total }
  create(resource, params) => { data: T }
  update(resource, params) => { data: T }
  delete(resource, params) => { data: T }
  deleteMany(resource, params) => { data: T[] }

  Custom Methods
  - signUp({ email, password, first_name, last_name })
  - salesCreate(data) - Create team member
  - salesUpdate(id, data) - Update team member
  - updatePassword(id) - Send reset email
  - unarchiveDeal(deal) - Restore archived deal
  - getActivityLog(companyId?) - Fetch audit log
  - isInitialized() - Check if system is set up
  - mergeContacts(sourceId, targetId) - Merge contacts

  🔍 Filter Syntax

  Uses PostgREST convention:
  field_name@operator=value

  Examples:
  first_name@eq="John"
  status@ne="inactive"
  created_at@gt=2024-01-01
  email@contains="example.com"
  contact_ids@cs={1,2,3}  # array contains

  Operators: eq, ne, gt, gte, lt, lte, in, nin, contains, icontains, cs

  📂 File Locations

  - Hooks: src/hooks/, src/components/atomic-crm/*/use*.tsx
  - Edge Functions: supabase/functions/{users,updatePassword,mergeContacts,postmark}/
  - Data Providers: src/components/atomic-crm/providers/{supabase,fakerest}/
  - Auth Providers: src/components/atomic-crm/providers/{supabase,fakerest}/authProvider.ts

  All APIs and hooks are fully typed with TypeScript and work with both Supabase (production) and FakeRest
  (development) backends!