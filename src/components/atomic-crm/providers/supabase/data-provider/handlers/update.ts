import type { DataProvider } from "ra-core";
import { supabase } from "../../supabase";
import { fetchEnrichedRecord } from "../enrichment";
import {
  stripContactSummaryFields,
  stripCompanySummaryFields,
  stripTaskSummaryFields,
  stripDealSummaryFields,
  stripInvoiceSummaryFields,
} from "../transforms";

// ---------------------------------------------------------------------------
// update overrides
// ---------------------------------------------------------------------------

export const handleUpdate = async (
  baseDataProvider: DataProvider,
  resource: string,
  params: any,
) => {
  if (resource === "contacts") {
    const contactData = stripContactSummaryFields(params.data);

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

    const enriched = await fetchEnrichedRecord("contacts_summary", params.id);
    return enriched ?? { data };
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
    const companyData = stripCompanySummaryFields(params.data);

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

    const enriched = await fetchEnrichedRecord("companies_summary", params.id);
    return enriched ?? { data };
  }

  if (resource === "tasks") {
    const cleanData = stripTaskSummaryFields(params.data);

    const result = await baseDataProvider.update(resource, {
      ...params,
      data: cleanData,
    });

    const enriched = await fetchEnrichedRecord("tasks_summary", params.id);
    return enriched ?? result;
  }

  if (resource === "deals") {
    const cleanData = stripDealSummaryFields(params.data);

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

    const enriched = await fetchEnrichedRecord("deals_summary", params.id);
    return enriched ?? { data };
  }

  if (resource === "invoices") {
    const { items, ...rawData } = params.data;
    const cleanData = stripInvoiceSummaryFields(rawData);

    const result = await baseDataProvider.update(resource, {
      ...params,
      data: {
        ...cleanData,
        updated_at: new Date().toISOString(),
      },
    });

    if (items) {
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
};
