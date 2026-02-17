import type { DataProvider, GetListParams, Identifier } from "ra-core";

import { supabase } from "../supabase";
import { isEnrichedRecordValid } from "./enrichment";
import {
  extractInvoiceSummaryPayload,
  stripCompanySummaryReadOnlyFields,
  stripContactSummaryReadOnlyFields,
  stripDealSummaryReadOnlyFields,
  stripTaskSummaryReadOnlyFields,
} from "./transforms";

export const createResourceCrudHandlers = (baseDataProvider: DataProvider) => ({
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
    if (resource === "companyNotes") {
      return baseDataProvider.getList(resource, {
        ...params,
        sort: { field: "date", order: "DESC" },
      });
    }
    if (resource === "contactNotes") {
      return baseDataProvider.getList(resource, {
        ...params,
        sort: { field: "date", order: "DESC" },
      });
    }
    if (resource === "dealNotes") {
      return baseDataProvider.getList(resource, {
        ...params,
        sort: { field: "date", order: "DESC" },
      });
    }
    if (resource === "taskNotes") {
      return baseDataProvider.getList(resource, {
        ...params,
        sort: { field: "date", order: "DESC" },
      });
    }

    return baseDataProvider.getList(resource, params);
  },

  async getOne(resource: string, params: { id: Identifier }) {
    if (resource === "invoices") {
      const { data, error } = await supabase
        .from("invoices_summary")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        console.error("[DataProvider] invoices_summary query error:", error);
        throw new Error(`Failed to fetch invoice: ${error.message}`);
      }

      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", params.id);

      if (itemsError) {
        console.error("[DataProvider] invoice_items query error:", itemsError);
      }

      return { data: { ...data, items: items || [] } };
    }

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

      if (!data) {
        console.warn(
          "[DataProvider] business_profile record missing, creating default...",
        );
        const { data: newData, error: insertError } = await supabase
          .from("business_profile")
          .insert({ id: 1, name: "My Company" })
          .select()
          .single();

        if (insertError) {
          console.error(
            "[DataProvider] Failed to create business_profile:",
            insertError,
          );
          throw new Error(
            `Failed to create business profile: ${insertError.message}`,
          );
        }

        return { data: newData };
      }

      return { data };
    }

    return baseDataProvider.getOne(resource, params);
  },

  async create(resource: string, params: any) {
    if (resource === "contacts") {
      const { data, error } = await supabase
        .from("contacts")
        .insert(params.data)
        .select()
        .single();

      if (error) {
        console.error("[DataProvider] contacts create error:", error);
        throw new Error(`Failed to create contact: ${error.message}`);
      }

      const { data: enrichedData, error: enrichError } = await supabase
        .from("contacts_summary")
        .select("*")
        .eq("id", data.id)
        .single();

      if (
        !isEnrichedRecordValid(enrichedData, enrichError, data.id as Identifier)
      ) {
        console.warn(
          "[DataProvider] Failed to fetch or verify enriched contact data. Falling back to base record.",
          enrichError || "ID mismatch or missing data",
        );
        return { data };
      }

      return { data: enrichedData };
    }

    if (resource === "companies") {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          ...params.data,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("[DataProvider] companies create error:", error);
        throw new Error(`Failed to create company: ${error.message}`);
      }

      const { data: enrichedData, error: enrichError } = await supabase
        .from("companies_summary")
        .select("*")
        .eq("id", data.id)
        .single();

      if (
        !isEnrichedRecordValid(enrichedData, enrichError, data.id as Identifier)
      ) {
        console.warn(
          "[DataProvider] Failed to fetch or verify enriched company data. Falling back to base record.",
          enrichError || "ID mismatch or missing data",
        );
        return { data };
      }

      return { data: enrichedData };
    }

    if (resource === "tasks") {
      const cleanData = stripTaskSummaryReadOnlyFields(params.data);

      const { data, error } = await supabase
        .from("tasks")
        .insert(cleanData)
        .select()
        .single();

      if (error) {
        console.error("[DataProvider] tasks create error:", error);
        throw new Error(`Failed to create task: ${error.message}`);
      }

      const { data: enrichedData, error: enrichError } = await supabase
        .from("tasks_summary")
        .select("*")
        .eq("id", data.id)
        .single();

      if (
        !isEnrichedRecordValid(enrichedData, enrichError, data.id as Identifier)
      ) {
        console.warn(
          "[DataProvider] Failed to fetch or verify enriched task data:",
          enrichError || "ID mismatch or missing data",
        );
        return { data };
      }

      return { data: enrichedData };
    }

    if (resource === "deals") {
      const cleanData = stripDealSummaryReadOnlyFields(params.data);

      const { data, error } = await supabase
        .from("deals")
        .insert(cleanData)
        .select()
        .single();

      if (error) {
        console.error("[DataProvider] deals create error:", error);
        throw new Error(`Failed to create deal: ${error.message}`);
      }

      const { data: enrichedData, error: enrichError } = await supabase
        .from("deals_summary")
        .select("*")
        .eq("id", data.id)
        .single();

      if (
        !isEnrichedRecordValid(enrichedData, enrichError, data.id as Identifier)
      ) {
        console.warn(
          "[DataProvider] Failed to fetch or verify enriched deal data:",
          enrichError || "ID mismatch or missing data",
        );
        return { data };
      }

      return { data: enrichedData };
    }

    if (resource === "invoices") {
      const { items, cleanData: invoiceData } = extractInvoiceSummaryPayload(
        params.data,
      );

      const { data: createdInvoice, error } = await supabase
        .from("invoices")
        .insert({
          ...invoiceData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("[DataProvider] invoices create error:", error);
        throw new Error(`Failed to create invoice: ${error.message}`);
      }

      const invoiceItems = items as any;
      if (invoiceItems && invoiceItems.length > 0) {
        await Promise.all(
          invoiceItems.map((item: any) => {
            const { id: _id, ...itemData } = item;
            return baseDataProvider.create("invoice_items", {
              data: { ...itemData, invoice_id: createdInvoice.id },
            });
          }),
        );
      }

      const { data: enrichedData, error: enrichError } = await supabase
        .from("invoices_summary")
        .select("*")
        .eq("id", createdInvoice.id)
        .single();

      if (
        !isEnrichedRecordValid(
          enrichedData,
          enrichError,
          createdInvoice.id as Identifier,
        )
      ) {
        console.warn(
          "[DataProvider] Failed to fetch or verify enriched invoice data. Falling back to base record.",
          enrichError || "ID mismatch or missing data",
        );
        return { data: createdInvoice };
      }

      return { data: enrichedData };
    }

    return baseDataProvider.create(resource, params);
  },

  async update(resource: string, params: any) {
    if (resource === "contacts") {
      const contactData = stripContactSummaryReadOnlyFields(params.data);

      const { data, error } = await supabase
        .from("contacts")
        .update(contactData)
        .eq("id", params.id)
        .select()
        .single();

      if (error) {
        console.error("[DataProvider] contacts update error:", error);
        throw new Error(`Failed to update contact: ${error.message}`);
      }

      const { data: enrichedData, error: enrichError } = await supabase
        .from("contacts_summary")
        .select("*")
        .eq("id", params.id)
        .single();

      if (
        !isEnrichedRecordValid(
          enrichedData,
          enrichError,
          params.id as Identifier,
        )
      ) {
        console.warn(
          "[DataProvider] Failed to fetch or verify enriched contact data. Falling back to base record.",
          enrichError || "ID mismatch or missing data",
        );
        return { data };
      }

      return { data: enrichedData };
    }

    if (resource === "business_profile") {
      const { data, error } = await supabase
        .from("business_profile")
        .update(params.data)
        .eq("id", params.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("[DataProvider] business_profile update error:", error);
        throw new Error(`Failed to update business profile: ${error.message}`);
      }

      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("business_profile")
          .insert({ id: 1, ...params.data })
          .select()
          .single();

        if (insertError) {
          console.error(
            "[DataProvider] Failed to create business_profile:",
            insertError,
          );
          throw new Error(
            `Failed to create business profile: ${insertError.message}`,
          );
        }

        return { data: newData };
      }

      return { data };
    }

    if (resource === "companies") {
      const companyData = stripCompanySummaryReadOnlyFields(params.data);

      const { data, error } = await supabase
        .from("companies")
        .update(companyData)
        .eq("id", params.id)
        .select()
        .single();

      if (error) {
        console.error("[DataProvider] companies update error:", error);
        throw new Error(`Failed to update company: ${error.message}`);
      }

      const { data: enrichedData, error: enrichError } = await supabase
        .from("companies_summary")
        .select("*")
        .eq("id", params.id)
        .single();

      if (
        !isEnrichedRecordValid(
          enrichedData,
          enrichError,
          params.id as Identifier,
        )
      ) {
        console.warn(
          "[DataProvider] Failed to fetch or verify enriched company data. Falling back to base record.",
          enrichError || "ID mismatch or missing data",
        );
        return { data };
      }

      return { data: enrichedData };
    }

    if (resource === "tasks") {
      const data = stripTaskSummaryReadOnlyFields(params.data);

      const result = await baseDataProvider.update(resource, {
        ...params,
        data,
      });

      const { data: enrichedData, error: enrichError } = await supabase
        .from("tasks_summary")
        .select("*")
        .eq("id", params.id)
        .single();

      if (
        !isEnrichedRecordValid(
          enrichedData,
          enrichError,
          params.id as Identifier,
        )
      ) {
        console.warn(
          "[DataProvider] Failed to fetch or verify enriched task data:",
          enrichError || "ID mismatch or missing data",
        );
        return result;
      }

      return { data: enrichedData };
    }

    if (resource === "deals") {
      const cleanData = stripDealSummaryReadOnlyFields(params.data);

      const { data, error } = await supabase
        .from("deals")
        .update(cleanData)
        .eq("id", params.id)
        .select()
        .single();

      if (error) {
        console.error("[DataProvider] deals update error:", error);
        throw new Error(`Failed to update deal: ${error.message}`);
      }

      const { data: enrichedData, error: enrichError } = await supabase
        .from("deals_summary")
        .select("*")
        .eq("id", params.id)
        .single();

      if (
        !isEnrichedRecordValid(
          enrichedData,
          enrichError,
          params.id as Identifier,
        )
      ) {
        console.warn(
          "[DataProvider] Failed to fetch or verify enriched deal data:",
          enrichError || "ID mismatch or missing data",
        );
        return { data };
      }

      return { data: enrichedData };
    }

    if (resource === "invoices") {
      const { items, cleanData } = extractInvoiceSummaryPayload(params.data);

      const result = await baseDataProvider.update(resource, {
        ...params,
        data: {
          ...cleanData,
          updated_at: new Date().toISOString(),
        },
      });

      if (items) {
        await supabase.from("invoice_items").delete().eq("invoice_id", params.id);

        const invoiceItems = items as any;
        if (invoiceItems.length > 0) {
          await Promise.all(
            invoiceItems.map((item: any) => {
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
});
