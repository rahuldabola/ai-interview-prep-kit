"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../apiClient";
import type { Kit, KitDetail, QuestionCategory } from "../types";

export function useKitDetail(id: string) {
  return useQuery<KitDetail>({
    queryKey: ["kit", id],
    queryFn: () => api.get(`/api/kits/${id}`),
    refetchInterval: (query) => (query.state.data?.status === "generating" ? 2000 : false),
  });
}

function useKitMutation<TVars>(id: string, fn: (vars: TVars) => Promise<{ kit: Kit }>) {
  const qc = useQueryClient();
  return useMutation<{ kit: Kit }, Error, TVars>({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData<KitDetail>(["kit", id], (prev) => (prev ? { ...prev, kit: data.kit } : prev));
    },
  });
}

export function useEditRequirement(id: string) {
  return useKitMutation(id, ({ reqId, patch }: { reqId: string; patch: Record<string, unknown> }) =>
    api.patch(`/api/kits/${id}/requirements/${reqId}`, patch)
  );
}

export function useEditQuestion(id: string) {
  return useKitMutation(id, ({ qId, patch }: { qId: string; patch: Record<string, unknown> }) =>
    api.patch(`/api/kits/${id}/questions/${qId}`, patch)
  );
}

export function useAddQuestion(id: string) {
  return useKitMutation(
    id,
    (body: { category: QuestionCategory; prompt: string; answer_outline: string; difficulty: 1 | 2 | 3; requirement_ids: string[] }) =>
      api.post(`/api/kits/${id}/questions`, body)
  );
}

export function useDeleteQuestion(id: string) {
  return useKitMutation(id, ({ qId }: { qId: string }) => api.delete(`/api/kits/${id}/questions/${qId}`));
}

/**
 * Optimistic: the question list reorders in the cache immediately (drag/keyboard reorder
 * should feel instant, Section 12), and rolls back only if the server rejects it.
 */
export function useReorderQuestions(id: string) {
  const qc = useQueryClient();
  return useMutation<{ kit: Kit }, Error, { category: QuestionCategory; order: string[] }, { previous?: KitDetail }>({
    mutationFn: (body) => api.post(`/api/kits/${id}/questions/reorder`, body),
    onMutate: async ({ category, order }) => {
      await qc.cancelQueries({ queryKey: ["kit", id] });
      const previous = qc.getQueryData<KitDetail>(["kit", id]);
      if (previous?.kit) {
        const byId = new Map(previous.kit.questions.map((q) => [q.id, q]));
        const others = previous.kit.questions.filter((q) => q.category !== category);
        const reordered = order.map((qid) => byId.get(qid)).filter((q): q is NonNullable<typeof q> => Boolean(q));
        qc.setQueryData<KitDetail>(["kit", id], { ...previous, kit: { ...previous.kit, questions: [...others, ...reordered] } });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(["kit", id], context.previous);
    },
    onSuccess: (data) => {
      qc.setQueryData<KitDetail>(["kit", id], (prev) => (prev ? { ...prev, kit: data.kit } : prev));
    },
  });
}

export function useEditFlashcard(id: string) {
  return useKitMutation(id, ({ cardId, patch }: { cardId: string; patch: Record<string, unknown> }) =>
    api.patch(`/api/kits/${id}/flashcards/${cardId}`, patch)
  );
}

export function useAddFlashcard(id: string) {
  return useKitMutation(id, (body: { front: string; back: string; requirement_ids: string[] }) =>
    api.post(`/api/kits/${id}/flashcards`, body)
  );
}

export function useDeleteFlashcard(id: string) {
  return useKitMutation(id, ({ cardId }: { cardId: string }) => api.delete(`/api/kits/${id}/flashcards/${cardId}`));
}

export function useEditCompanyBrief(id: string) {
  return useKitMutation(id, (patch: Record<string, unknown>) => api.patch(`/api/kits/${id}/brief`, patch));
}

export function useRegenerateSection(id: string) {
  const qc = useQueryClient();
  return useMutation<{ kit: Kit; applied: boolean }, Error, { section: string }>({
    mutationFn: (body) => api.post(`/api/kits/${id}/regenerate`, body),
    onSuccess: (data) => {
      qc.setQueryData<KitDetail>(["kit", id], (prev) => (prev ? { ...prev, kit: data.kit } : prev));
    },
  });
}
