"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../apiClient";
import type { KitListItem } from "../types";

export function useKitList() {
  return useQuery<{ kits: KitListItem[] }>({
    queryKey: ["kits"],
    queryFn: () => api.get("/api/kits"),
    // Kits generate in the background, so the list keeps itself current while any of them
    // is still building — and stops polling once everything has settled.
    refetchInterval: (query) =>
      query.state.data?.kits.some((kit) => kit.status === "generating" || kit.status === "draft") ? 4000 : false,
  });
}

export interface CreateKitInput {
  jd: string;
  company_url: string;
  days: number;
}

export function useCreateKit() {
  const qc = useQueryClient();
  return useMutation<{ id: string; status: string; duplicate: boolean }, Error, CreateKitInput>({
    mutationFn: (body) => api.post("/api/kits", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kits"] }),
  });
}

/**
 * Optimistic delete: the card disappears on click rather than after the round trip, and
 * comes back if the server refuses.
 */
export function useDeleteKit() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }, { previous?: { kits: KitListItem[] } }>({
    mutationFn: ({ id }) => api.delete(`/api/kits/${id}`),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["kits"] });
      const previous = qc.getQueryData<{ kits: KitListItem[] }>(["kits"]);
      if (previous) {
        qc.setQueryData<{ kits: KitListItem[] }>(["kits"], { kits: previous.kits.filter((kit) => kit.id !== id) });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(["kits"], context.previous);
    },
    onSuccess: (_data, { id }) => {
      qc.removeQueries({ queryKey: ["kit", id] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["kits"] }),
  });
}

/** Restarts a generation that failed or was cut short by a server restart. */
export function useRetryKit() {
  const qc = useQueryClient();
  return useMutation<{ id: string; status: string }, Error, { id: string }>({
    mutationFn: ({ id }) => api.post(`/api/kits/${id}/retry`),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["kits"] });
      qc.invalidateQueries({ queryKey: ["kit", id] });
    },
  });
}
