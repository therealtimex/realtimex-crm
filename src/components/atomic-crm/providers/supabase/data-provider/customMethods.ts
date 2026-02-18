import type { DataProvider, Identifier } from "ra-core";
import type { Deal, Sale, SalesFormData, SignUpData } from "../../../types";
import { getActivityLog } from "../../commons/activity";
import { getIsInitialized } from "../authProvider";
import { supabase } from "../supabase";

export const buildCustomMethods = (baseDataProvider: DataProvider) => ({
  async signUp({ email, password, first_name, last_name }: SignUpData) {
    const { data, error } = await supabase.functions.invoke("setup", {
      method: "POST",
      body: { email, password, first_name, last_name },
    });

    if (!data || error) {
      console.error("signUp.error", error);
      throw new Error("Failed to create account");
    }

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

    // NOTE: returns the caller's partial input (not the server response) — known behaviour.
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
    const { data: deals } = await baseDataProvider.getList<Deal>("deals", {
      filter: { stage: deal.stage },
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "index", order: "ASC" },
    });

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
});
