import type { DataProvider } from "ra-core";
import { supabase } from "../../supabase";
import { fetchEnrichedRecord } from "../enrichment";
import {
  stripTaskSummaryFields,
  stripDealSummaryFields,
  stripInvoiceSummaryFields,
} from "../transforms";

// ---------------------------------------------------------------------------
// create overrides
// ---------------------------------------------------------------------------

export const handleCreate = async (
  baseDataProvider: DataProvider,
  resource: string,
  params: any,
) => {
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

    const enriched = await fetchEnrichedRecord("contacts_summary", data.id);
    return enriched ?? { data };
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

    const enriched = await fetchEnrichedRecord("companies_summary", data.id);
    return enriched ?? { data };
  }

  if (resource === "tasks") {
    const cleanData = stripTaskSummaryFields(params.data);

    const { data, error } = await supabase
      .from("tasks")
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      console.error("[DataProvider] tasks create error:", error);
      throw new Error(`Failed to create task: ${error.message}`);
    }

    const enriched = await fetchEnrichedRecord("tasks_summary", data.id);
    return enriched ?? { data };
  }

  if (resource === "deals") {
    const cleanData = stripDealSummaryFields(params.data);

    const { data, error } = await supabase
      .from("deals")
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      console.error("[DataProvider] deals create error:", error);
      throw new Error(`Failed to create deal: ${error.message}`);
    }

    const enriched = await fetchEnrichedRecord("deals_summary", data.id);
    return enriched ?? { data };
  }

  if (resource === "invoices") {
    const { items, ...rawData } = params.data;
    const cleanData = stripInvoiceSummaryFields(rawData);

    const { data: createdInvoice, error } = await supabase
      .from("invoices")
      .insert({
        ...cleanData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[DataProvider] invoices create error:", error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }

    if (items && items.length > 0) {
      await Promise.all(
        items.map((item: any) => {
          const { id: _id, ...itemData } = item;
          return baseDataProvider.create("invoice_items", {
            data: { ...itemData, invoice_id: createdInvoice.id },
          });
        }),
      );
    }

    const enriched = await fetchEnrichedRecord(
      "invoices_summary",
      createdInvoice.id,
    );
    return enriched ?? { data: createdInvoice };
  }

  return baseDataProvider.create(resource, params);
};
