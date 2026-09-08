"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../apiClient";
import type { KitListItem } from "../types";

export function useKitList() {
  return useQuery<{ kits: KitListItem[] }>({
    queryKey: ["kits"],
    queryFn: () => api.get("/api/kits"),
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
