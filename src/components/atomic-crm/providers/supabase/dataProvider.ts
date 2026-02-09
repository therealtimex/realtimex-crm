import { supabaseDataProvider } from "ra-supabase-core";
import {
  withLifecycleCallbacks,
  type CreateParams,
  type DataProvider,
  type GetListParams,
  type Identifier,
  type UpdateParams,
} from "ra-core";

import type {
  Contact,
  ContactNote,
  Deal,
  DealNote,
  RAFile,
  Sale,
  SalesFormData,
  SignUpData,
} from "../../types";
import { getActivityLog } from "../commons/activity";
import { getCompanyAvatar } from "../commons/getCompanyAvatar";
import { getContactAvatar } from "../commons/getContactAvatar";
import { getIsInitialized } from "./authProvider";
import { supabase } from "./supabase";
import { getSupabaseConfig } from "@/lib/supabase-config";

// Get config dynamically (from localStorage or env vars)
// If no config, create a dummy provider that will never be used
// (App.tsx will show setup wizard before CRM loads)
const config = getSupabaseConfig() || {
  url: "https://placeholder.supabase.co",
  anonKey: "placeholder-key",
};

const baseDataProvider = supabaseDataProvider({
  instanceUrl: config.url,
  apiKey: config.anonKey,
  supabaseClient: supabase,
  sortOrder: "asc,desc.nullslast" as any,
});

const processCompanyLogo = async (params: any) => {
  let logo = params.data.logo;

  if (typeof logo !== "object" || logo === null || !logo.src) {
    logo = await getCompanyAvatar(params.data);
  } else if (logo.rawFile instanceof File) {
    await uploadToBucket(logo);
  }

  return {
    ...params,
    data: {
      ...params.data,
      logo,
    },
  };
};

async function processContactAvatar(
  params: UpdateParams<Contact>,
): Promise<UpdateParams<Contact>>;

async function processContactAvatar(
  params: CreateParams<Contact>,
): Promise<CreateParams<Contact>>;

async function processContactAvatar(
  params: CreateParams<Contact> | UpdateParams<Contact>,
): Promise<CreateParams<Contact> | UpdateParams<Contact>> {
  const { data } = params;
  if (data.avatar?.src || !data.email_jsonb || !data.email_jsonb.length) {
    return params;
  }
  const avatarUrl = await getContactAvatar(data);

  // Clone the data and modify the clone
  const newData = { ...data, avatar: { src: avatarUrl || undefined } };

  return { ...params, data: newData };
}

const dataProviderWithCustomMethods = {
  ...baseDataProvider,
  async getList(resource: string, params: GetListParams) {
    if (resource === "companies") {
      return baseDataProvider.getList("companies_summary", params);
    }
    if (resource === "contacts") {
      return baseDataProvider.getList("contacts_summary", params);
    }
    if (resource === "tasks") {
      return baseDataProvider.getList("tasks_summary", params);
    }
    if (resource === "deals") {
      return baseDataProvider.getList("deals_summary", params);
    }
    if (resource === "invoices") {
      return baseDataProvider.getList("invoices_summary", params);
    }

    return baseDataProvider.getList(resource, params);
  },
  async getOne(resource: string, params: any) {
    if (resource === "companies") {
      // Use direct Supabase query for better error handling
      const { data, error } = await supabase
        .from("companies_summary")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (error) {
        console.error("[DataProvider] companies_summary query error:", error);
        throw new Error(`Failed to fetch company: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Company with id ${params.id} not found`);
      }

      return { data };
    }
    if (resource === "contacts") {
      const { data, error } = await supabase
        .from("contacts_summary")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (error) {
        console.error("[DataProvider] contacts_summary query error:", error);
        throw new Error(`Failed to fetch contact: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Contact with id ${params.id} not found`);
      }

      return { data };
    }

    if (resource === "tasks") {
      const { data, error } = await supabase
        .from("tasks_summary")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (error) {
        console.error("[DataProvider] tasks_summary query error:", error);
        throw new Error(`Failed to fetch task: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Task with id ${params.id} not found`);
      }

      return { data };
    }

    if (resource === "deals") {
      const { data, error } = await supabase
        .from("deals_summary")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (error) {
        console.error("[DataProvider] deals_summary query error:", error);
        throw new Error(`Failed to fetch deal: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Deal with id ${params.id} not found`);
      }

      return { data };
    }

    if (resource === "invoices") {
      const { data, error } = await supabase
        .from("invoices_summary")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (error) {
        console.error("[DataProvider] invoices_summary query error:", error);
        throw new Error(`Failed to fetch invoice: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Invoice with id ${params.id} not found`);
      }

      return { data };
    }

    // Special handling for business_profile (singleton table)
    // NOTE: The ra-supabase-core adapter has issues with singleton tables where
    // the response format doesn't match react-admin's expectations. This direct
    // query approach is more reliable and is the recommended pattern for single-row tables.
    if (resource === "sales") {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (error) {
        console.error("[DataProvider] sales query error:", error);
        throw new Error(`Failed to fetch sales: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Sales user with id ${params.id} not found`);
      }

      return { data };
    }

    if (resource === "business_profile") {
      const { data, error } = await supabase
        .from("business_profile")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (error) {
        console.error("[DataProvider] business_profile query error:", error);
        throw new Error(`Failed to fetch business profile: ${error.message}`);
      }

      // If no data exists, create a default record (safe for singleton tables)
      // This ensures the app works even if migrations haven't been run yet
      if (!data) {
        console.warn("[DataProvider] business_profile record missing, creating default...");
        const { data: newData, error: insertError } = await supabase
          .from("business_profile")
          .insert({ id: 1, name: "My Company" })
          .select()
          .single();

        if (insertError) {
          console.error("[DataProvider] Failed to create business_profile:", insertError);
          throw new Error(`Failed to create business profile: ${insertError.message}`);
        }

        return { data: newData };
      }

      return { data };
    }

    return baseDataProvider.getOne(resource, params);
  },
  async create(resource: string, params: any) {
    if (resource === "invoices") {
      const {
        items,
        company_name: _cn,
        contact_name: _ctn,
        contact_email: _ce,
        deal_name: _dn,
        sales_name: _sn,
        nb_items: _ni,
        nb_notes: _nn,
        computed_status: _cs,
        days_overdue: _do,
        balance_due: _bd,
        ...data
      } = params.data;

      const result = await baseDataProvider.create(resource, {
        ...params,
        data: {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      if (items && items.length > 0) {
        await Promise.all(
          items.map((item: any) => {
            const { id: _id, ...itemData } = item;
            return baseDataProvider.create("invoice_items", {
              data: { ...itemData, invoice_id: result.data.id },
            });
          }),
        );
      }
      return result;
    }
    return baseDataProvider.create(resource, params);
  },

  async update(resource: string, params: any) {
    if (resource === "tasks") {
      const {
        contact_first_name: _contact_first_name,
        contact_last_name: _contact_last_name,
        contact_email: _contact_email,
        company_name: _company_name,
        deal_name: _deal_name,
        company_id_computed: _company_id_computed,
        assigned_first_name: _assigned_first_name,
        assigned_last_name: _assigned_last_name,
        creator_first_name: _creator_first_name,
        creator_last_name: _creator_last_name,
        nb_notes: _nb_notes,
        last_note_date: _last_note_date,
        ...data
      } = params.data;

      return baseDataProvider.update(resource, {
        ...params,
        data,
      });
    }

    if (resource === "invoices") {
      const {
        items,
        company_name: _cn,
        contact_name: _ctn,
        contact_email: _ce,
        deal_name: _dn,
        sales_name: _sn,
        nb_items: _ni,
        nb_notes: _nn,
        computed_status: _cs,
        days_overdue: _do,
        balance_due: _bd,
        ...data
      } = params.data;

      const result = await baseDataProvider.update(resource, {
        ...params,
        data: {
          ...data,
          updated_at: new Date().toISOString(),
        },
      });

      if (items) {
        // Simple sync strategy: remove all and re-add
        await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", params.id);
        if (items.length > 0) {
          await Promise.all(
            items.map((item: any) => {
              const { id: _id, ...itemData } = item;
              return baseDataProvider.create("invoice_items", {
                data: { ...itemData, invoice_id: params.id },
              });
            }),
          );
        }
      }
      return result;
    }
    return baseDataProvider.update(resource, params);
  },

  async signUp({ email, password, first_name, last_name }: SignUpData) {
    // Use admin API via edge function to create first user
    // This bypasses the signup restriction (enable_signup = false)
    const { data, error } = await supabase.functions.invoke("setup", {
      method: "POST",
      body: { email, password, first_name, last_name },
    });

    if (!data || error) {
      console.error("signUp.error", error);
      throw new Error("Failed to create account");
    }

    // Update the is initialized cache
    getIsInitialized._is_initialized_cache = true;

    return {
      id: data.data.id,
      email,
      password,
    };
  },
  async salesCreate(body: SalesFormData) {
    const { data, error } = await supabase.functions.invoke<Sale>("users", {
      method: "POST",
      body,
    });

    if (!data || error) {
      console.error("salesCreate.error", error);
      throw new Error("Failed to create account manager");
    }

    return data;
  },
  async salesUpdate(
    id: Identifier,
    data: Partial<Omit<SalesFormData, "password">>,
  ) {
    const { email, first_name, last_name, administrator, avatar, disabled } =
      data;

    const { data: sale, error } = await supabase.functions.invoke<Sale>(
      "users",
      {
        method: "PATCH",
        body: {
          sales_id: id,
          email,
          first_name,
          last_name,
          administrator,
          disabled,
          avatar,
        },
      },
    );

    if (!sale || error) {
      console.error("salesUpdate.error", error);
      throw new Error("Failed to update account manager");
    }

    return data;
  },
  async resendInvite(id: Identifier) {
    const { data: sale, error } = await supabase.functions.invoke<Sale>(
      "users",
      {
        method: "PUT",
        body: {
          sales_id: id,
          action: "invite",
        },
      },
    );

    if (!sale || error) {
      console.error("resendInvite.error", error);
      throw new Error("Failed to resend invitation");
    }

    return sale;
  },
  async resetPassword(id: Identifier) {
    const { data: sale, error } = await supabase.functions.invoke<Sale>(
      "users",
      {
        method: "PUT",
        body: {
          sales_id: id,
          action: "reset",
        },
      },
    );

    if (!sale || error) {
      console.error("resetPassword.error", error);
      throw new Error("Failed to send password reset");
    }

    return sale;
  },
  async updatePassword(id: Identifier) {
    const { data: passwordUpdated, error } =
      await supabase.functions.invoke<boolean>("updatePassword", {
        method: "PATCH",
        body: {
          sales_id: id,
        },
      });

    if (!passwordUpdated || error) {
      console.error("passwordUpdate.error", error);
      throw new Error("Failed to update password");
    }

    return passwordUpdated;
  },
  async unarchiveDeal(deal: Deal) {
    // get all deals where stage is the same as the deal to unarchive
    const { data: deals } = await baseDataProvider.getList<Deal>("deals", {
      filter: { stage: deal.stage },
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "index", order: "ASC" },
    });

    // set index for each deal starting from 1, if the deal to unarchive is found, set its index to the last one
    const updatedDeals = deals.map((d, index) => ({
      ...d,
      index: d.id === deal.id ? 0 : index + 1,
      archived_at: d.id === deal.id ? null : d.archived_at,
    }));

    return await Promise.all(
      updatedDeals.map((updatedDeal) =>
        baseDataProvider.update("deals", {
          id: updatedDeal.id,
          data: updatedDeal,
          previousData: deals.find((d) => d.id === updatedDeal.id),
        }),
      ),
    );
  },
  async getActivityLog(companyId?: Identifier) {
    return getActivityLog(baseDataProvider, companyId);
  },
  async isInitialized() {
    return getIsInitialized();
  },
  async mergeContacts(sourceId: Identifier, targetId: Identifier) {
    const { data, error } = await supabase.functions.invoke("mergeContacts", {
      method: "POST",
      body: { loserId: sourceId, winnerId: targetId },
    });

    if (error) {
      console.error("mergeContacts.error", error);
      throw new Error("Failed to merge contacts");
    }

    return data;
  },
  async mergeCompanies(sourceId: Identifier, targetId: Identifier) {
    const { data, error } = await supabase.functions.invoke("mergeCompanies", {
      method: "POST",
      body: { loserId: sourceId, winnerId: targetId },
    });

    if (error) {
      console.error("mergeCompanies.error", error);
      throw new Error("Failed to merge companies");
    }

    return data;
  },
} satisfies DataProvider;

export type CrmDataProvider = typeof dataProviderWithCustomMethods;

export const dataProvider = withLifecycleCallbacks(
  dataProviderWithCustomMethods,
  [
    {
      resource: "business_profile",
      beforeUpdate: async (params) => {
        if (params.data.logo && params.data.logo.rawFile instanceof File) {
          await uploadToBucket(params.data.logo);
        }
        return params;
      },
    },
    {
      resource: "contactNotes",
      beforeSave: async (data: ContactNote, _, __) => {
        if (data.attachments) {
          for (const fi of data.attachments) {
            await uploadToBucket(fi);
          }
        }
        return data;
      },
    },
    {
      resource: "dealNotes",
      beforeSave: async (data: DealNote, _, __) => {
        if (data.attachments) {
          for (const fi of data.attachments) {
            await uploadToBucket(fi);
          }
        }
        return data;
      },
    },
    {
      resource: "companyNotes",
      beforeSave: async (data: ContactNote, _, __) => {
        if (data.attachments) {
          for (const fi of data.attachments) {
            await uploadToBucket(fi);
          }
        }
        return data;
      },
    },
    {
      resource: "taskNotes",
      beforeSave: async (data: ContactNote, _, __) => {
        if (data.attachments) {
          for (const fi of data.attachments) {
            await uploadToBucket(fi);
          }
        }
        return data;
      },
    },
    {
      resource: "sales",
      beforeSave: async (data: Sale, _, __) => {
        if (data.avatar) {
          await uploadToBucket(data.avatar);
        }
        return data;
      },
    },
    {
      resource: "contacts",
      beforeCreate: async (params) => {
        return processContactAvatar(params);
      },
      beforeUpdate: async (params) => {
        return processContactAvatar(params);
      },
      beforeGetList: async (params) => {
        return applyFullTextSearch(["search_text"])(params);
      },
    },
    {
      resource: "companies",
      beforeGetList: async (params) => {
        return applyFullTextSearch(["search_text"])(params);
      },
      beforeCreate: async (params) => {
        const createParams = await processCompanyLogo(params);

        return {
          ...createParams,
          data: {
            ...createParams.data,
            created_at: new Date().toISOString(),
          },
        };
      },
      beforeUpdate: async (params) => {
        return await processCompanyLogo(params);
      },
    },
    {
      resource: "contacts_summary",
      beforeGetList: async (params) => {
        return applyFullTextSearch(["search_text"])(params);
      },
    },
    {
      resource: "tasks",
      beforeGetList: async (params) => {
        return applyFullTextSearch(["text", "contact_first_name"])(params);
      },
    },
    {
      resource: "deals",
      beforeGetList: async (params) => {
        return applyFullTextSearch(["name", "category", "description"])(params);
      },
    },
  ],
);

const applyFullTextSearch = (columns: string[]) => (params: GetListParams) => {
  if (!params.filter?.q) {
    return params;
  }
  const { q, ...filter } = params.filter;

  // Smart multi-word search using concatenated search field
  // The database view provides a 'search_text' column that concatenates all searchable fields
  // This allows order-independent word matching across all fields
  // Example: "Le Dang" matches "Trung Le" + "Dang Corp" because search_text contains both words

  // Use the search_text column if available (for contacts and contacts_summary)
  if (columns.includes("search_text")) {
    return {
      ...params,
      filter: {
        ...filter,
        "search_text@ilike": q,
      },
    };
  }

  // Fallback: use OR search across all specified columns (for other resources)
  return {
    ...params,
    filter: {
      ...filter,
      "@or": columns.reduce((acc, column) => {
        if (column === "email")
          return {
            ...acc,
            [`email_fts@ilike`]: q,
          };
        if (column === "phone")
          return {
            ...acc,
            [`phone_fts@ilike`]: q,
          };
        else
          return {
            ...acc,
            [`${column}@ilike`]: q,
          };
      }, {}),
    },
  };
};

const uploadToBucket = async (fi: RAFile) => {
  if (!fi.src.startsWith("blob:") && !fi.src.startsWith("data:")) {
    // Sign URL check if path exists in the bucket
    if (fi.path) {
      const { error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(fi.path, 60);

      if (!error) {
        return;
      }
    }
  }

  const dataContent = fi.src
    ? await fetch(fi.src).then((res) => res.blob())
    : fi.rawFile;

  const file = fi.rawFile;
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, dataContent);

  if (uploadError) {
    console.error("uploadError", uploadError);
    throw new Error("Failed to upload attachment");
  }

  const { data } = supabase.storage.from("attachments").getPublicUrl(filePath);

  fi.path = filePath;
  fi.src = data.publicUrl;

  // save MIME type
  const mimeType = file.type;
  fi.type = mimeType;

  return fi;
};
