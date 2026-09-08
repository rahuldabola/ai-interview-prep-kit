"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../apiClient";

export interface PracticeSession {
  order: string[];
  covered: string[];
  totalCards: number;
  latestConfidence: Record<string, number>;
}

export function usePracticeSession(id: string) {
  return useQuery<PracticeSession>({
    queryKey: ["practice-session", id],
    queryFn: () => api.get(`/api/kits/${id}/practice/session`),
  });
}

export function useRecordAttempt(id: string) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { flashcard_id: string; confidence: 1 | 2 | 3 | 4 | 5 }>({
    mutationFn: (body) => api.post(`/api/kits/${id}/practice`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["practice-session", id] }),
  });
}
