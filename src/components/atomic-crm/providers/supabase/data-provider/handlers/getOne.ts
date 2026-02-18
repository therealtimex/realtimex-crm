import type { DataProvider, Identifier } from "ra-core";
import { supabase } from "../../supabase";

// ---------------------------------------------------------------------------
// getOne overrides
// ---------------------------------------------------------------------------

export const handleGetOne = async (
  baseDataProvider: DataProvider,
  resource: string,
  params: { id: Identifier },
) => {
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
};
