"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../apiClient";

export interface WeakSpot {
  requirement_id: string;
  text: string;
  priority: "must" | "nice";
  kind: string;
  status: "unpracticed" | "practiced";
  avg_confidence: number | null;
  flashcard_ids: string[];
  question_ids: string[];
}

export function useWeakSpots(id: string) {
  return useQuery<{ weak_spots: WeakSpot[] }>({
    queryKey: ["weak-spots", id],
    queryFn: () => api.get(`/api/kits/${id}/weak-spots`),
  });
}
