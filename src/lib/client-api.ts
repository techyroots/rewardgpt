"use client";

import { useIdentityToken, usePrivy } from "@privy-io/react-auth";
import { useCallback } from "react";

/**
 * Calls our API with both Privy tokens attached.
 *
 * The access token says who the caller is; the identity token carries their
 * linked accounts so the server can confirm a payout wallet really belongs to
 * them without a rate-limited lookup on every request.
 */
export function useApi() {
  const { getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();

  return useCallback(
    async <T,>(
      path: string,
      options: { method?: "GET" | "POST"; body?: unknown } = {},
    ): Promise<T> => {
      const accessToken = await getAccessToken();
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (accessToken) headers.authorization = `Bearer ${accessToken}`;
      if (identityToken) headers["privy-id-token"] = identityToken;

      const response = await fetch(path, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });

      const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Something went wrong. Please try again.");
      }
      return payload;
    },
    [getAccessToken, identityToken],
  );
}
