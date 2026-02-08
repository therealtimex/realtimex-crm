/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-namespace */
import type { AuthProvider } from "ra-core";
import { supabaseAuthProvider } from "ra-supabase-core";

import { canAccess } from "../commons/canAccess";
import { supabase } from "./supabase";

const baseAuthProvider = supabaseAuthProvider(supabase, {
  getIdentity: async () => {
    const sale = await getSaleFromCache();

    if (sale == null) {
      throw new Error();
    }

    return {
      id: sale.id,
      fullName: `${sale.first_name} ${sale.last_name}`,
      avatar: sale.avatar?.src,
      locale: sale.locale ?? undefined,
      administrator: sale.administrator,
    };
  },
});

export async function getIsInitialized() {
  if (getIsInitialized._is_initialized_cache == null) {
    const { data } = await supabase.from("init_state").select("is_initialized");

    getIsInitialized._is_initialized_cache = data?.at(0)?.is_initialized > 0;
  }

  return getIsInitialized._is_initialized_cache;
}

export namespace getIsInitialized {
  export var _is_initialized_cache: boolean | null = null;
}

export const authProvider: AuthProvider = {
  ...baseAuthProvider,
  login: async (params) => {
    const result = await baseAuthProvider.login(params);
    // clear cached sale
    cachedSale = undefined;
    return result;
  },
  checkAuth: async (params) => {
    // Users are on the set-password page, nothing to do
    if (
      window.location.pathname === "/set-password" ||
      window.location.hash.includes("#/set-password")
    ) {
      return;
    }
    // Users are on the forgot-password page, nothing to do
    if (
      window.location.pathname === "/forgot-password" ||
      window.location.hash.includes("#/forgot-password")
    ) {
      return;
    }
    // Users are on the change-password page, nothing to do
    if (
      window.location.pathname === "/change-password" ||
      window.location.hash.includes("#/change-password")
    ) {
      return;
    }
    // Users are on the otp-login page, nothing to do
    if (
      window.location.pathname === "/otp-login" ||
      window.location.hash.includes("#/otp-login")
    ) {
      return;
    }
    // Users are on the sign-up page, nothing to do
    if (
      window.location.pathname === "/sign-up" ||
      window.location.hash.includes("#/sign-up")
    ) {
      return;
    }

    const isInitialized = await getIsInitialized();

    if (!isInitialized) {
      await supabase.auth.signOut();
      throw {
        redirectTo: "/sign-up",
        message: false,
      };
    }

    return baseAuthProvider.checkAuth(params);
  },
  canAccess: async (params) => {
    const isInitialized = await getIsInitialized();
    if (!isInitialized) return false;

    // Get the current user
    const sale = await getSaleFromCache();
    if (sale == null) return false;

    // Compute access rights from the sale role
    const role = sale.administrator ? "admin" : "user";
    return canAccess(role, params);
  },
};

let cachedSale: any;
let pendingSaleRequest: Promise<any> | null = null;

export const updateCachedSaleLocale = (locale: string) => {
  if (!cachedSale) return;
  cachedSale = {
    ...cachedSale,
    locale,
  };
};

const getSaleFromCache = async () => {
  // Return cached sale if available
  if (cachedSale != null) return cachedSale;

  // Deduplicate concurrent requests - if a request is already in flight, return it
  if (pendingSaleRequest != null) {
    return pendingSaleRequest;
  }

  // Create and store the promise for deduplication
  pendingSaleRequest = (async () => {
    try {
      const { data: dataSession, error: errorSession } =
        await supabase.auth.getSession();

      // Shouldn't happen after login but just in case
      if (dataSession?.session?.user == null || errorSession) {
        console.error("[Auth] Failed to get session:", errorSession);
        return undefined;
      }

      const { data: dataSale, error: errorSale } = await supabase
        .from("sales")
        .select("id, first_name, last_name, avatar, administrator, locale")
        .match({ user_id: dataSession?.session?.user.id })
        .maybeSingle();

      // If no sales record exists for this user, show helpful error
      if (dataSale == null || errorSale) {
        console.error("[Auth] Failed to get sale record:", errorSale);
        console.error(
          "[Auth] This usually means the database trigger didn't create a sales record."
        );
        console.error(
          "[Auth] Run this migration to fix: npx supabase db push"
        );
        return undefined;
      }

      cachedSale = dataSale;
      return dataSale;
    } finally {
      // Clear pending request after completion
      pendingSaleRequest = null;
    }
  })();

  return pendingSaleRequest;
};
