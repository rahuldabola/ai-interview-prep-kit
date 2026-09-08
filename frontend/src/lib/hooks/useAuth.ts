"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../apiClient";
import type { User } from "../types";

export function useCurrentUser() {
  return useQuery<{ user: User }, ApiError>({
    queryKey: ["me"],
    queryFn: () => api.get("/api/auth/me"),
    retry: false,
  });
}

/**
 * Client-side fallback to the middleware's cookie-presence check (Section 1: "sensible
 * handling of expired or invalid sessions"). If the cookie exists but the API rejects it
 * as expired/tampered, this redirects to /login instead of leaving the page stuck showing
 * stale or absent data.
 */
export function useRequireAuth() {
  const router = useRouter();
  const query = useCurrentUser();
  useEffect(() => {
    if (query.isError) {
      router.replace("/login");
    }
  }, [query.isError, router]);
  return query;
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation<{ user: User }, ApiError, { email: string; password: string }>({
    mutationFn: (body) => api.post("/api/auth/login", body),
    onSuccess: (data) => qc.setQueryData(["me"], data),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation<{ user: User }, ApiError, { email: string; password: string }>({
    mutationFn: (body) => api.post("/api/auth/register", body),
    onSuccess: (data) => qc.setQueryData(["me"], data),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => qc.setQueryData(["me"], undefined),
  });
}
