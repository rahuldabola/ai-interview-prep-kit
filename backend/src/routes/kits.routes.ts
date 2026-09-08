import { Router } from "express";
import { KitModel } from "../models/Kit.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateBody } from "../middleware/validateBody.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import {
  addFlashcardSchema,
  addQuestionSchema,
  createKitSchema,
  editCompanyBriefSchema,
  editFlashcardSchema,
  editQuestionSchema,
  editRequirementSchema,
  practiceAttemptSchema,
  regenerateSectionSchema,
  reorderQuestionsSchema,
} from "../validation/requestSchemas.js";
import { computeDedupeHash, addFlashcard, addQuestion, deleteFlashcard, deleteQuestion, editCompanyBrief, editFlashcard, editQuestion, editRequirement, reorderQuestions } from "../services/kitService.js";
import { regenerateSection, startGeneration } from "../services/generationService.js";
import { validateKit } from "../validation/kitSchema.js";
import type { Kit } from "../pipeline/types.js";

export const kitsRouter = Router();
kitsRouter.use(requireAuth);

async function loadOwnedKit(userId: string, kitId: string) {
  const doc = await KitModel.findOne({ _id: kitId, userId });
  if (!doc) throw new HttpError(404, "NOT_FOUND", "Kit not found");
  return doc;
}

kitsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const docs = await KitModel.find({ userId: req.userId })
      .select("status input createdAt updatedAt error kit.source")
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      kits: docs.map((d) => ({
        id: d._id,
        status: d.status,
        input: d.input,
        source: (d.kit as Kit | null)?.source ?? null,
        error: d.error,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  })
);

kitsRouter.post(
  "/",
  validateBody(createKitSchema),
  asyncHandler(async (req, res) => {
    const { jd, company_url, days } = req.body;
    const dedupeHash = computeDedupeHash(req.userId!, jd, company_url);

    const existing = await KitModel.findOne({ userId: req.userId, dedupeHash });
    if (existing) {
      res.status(200).json({ id: existing._id, status: existing.status, duplicate: true });
      return;
    }

    const doc = await KitModel.create({
      userId: req.userId,
      status: "draft",
      input: { jd, company_url, days },
      dedupeHash,
      kit: null,
    });

    startGeneration(doc._id.toString());
    res.status(202).json({ id: doc._id, status: "generating", duplicate: false });
  })
);

kitsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await loadOwnedKit(req.userId!, req.params.id);
    res.json({
      id: doc._id,
      status: doc.status,
      input: doc.input,
      kit: doc.kit,
      progress: doc.progress,
      skipped: doc.skipped,
      error: doc.error,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  })
);

kitsRouter.post(
  "/:id/regenerate",
  validateBody(regenerateSectionSchema),
  asyncHandler(async (req, res) => {
    const doc = await loadOwnedKit(req.userId!, req.params.id);
    if (doc.status !== "ready") {
      throw new HttpError(409, "KIT_NOT_READY", `Kit is currently "${doc.status}"; regenerate once it is ready`);
    }
    const { kit, applied } = await regenerateSection(doc as any, req.body.section);
    doc.kit = kit;
    doc.markModified("kit");
    await doc.save();
    res.json({ kit: doc.kit, applied });
  })
);

function mutateAndSave(handler: (kit: Kit, req: any) => unknown) {
  return asyncHandler(async (req: any, res: any) => {
    const doc = await loadOwnedKit(req.userId!, req.params.id);
    if (!doc.kit) throw new HttpError(409, "KIT_NOT_READY", "This kit has not finished generating yet");
    const kit = doc.kit as Kit;
    const result = handler(kit, req);
    const validation = validateKit(kit);
    if (!validation.valid) {
      throw new HttpError(400, "INVALID_EDIT", `That edit would make the kit invalid: ${validation.issues[0]?.message}`);
    }
    doc.markModified("kit");
    await doc.save();
    res.json({ kit: doc.kit, result });
  });
}

kitsRouter.patch("/:id/brief", validateBody(editCompanyBriefSchema), mutateAndSave((kit, req) => editCompanyBrief(kit, req.body)));

kitsRouter.patch("/:id/requirements/:reqId", validateBody(editRequirementSchema), mutateAndSave((kit, req) => editRequirement(kit, req.params.reqId, req.body)));

kitsRouter.patch("/:id/questions/:qId", validateBody(editQuestionSchema), mutateAndSave((kit, req) => editQuestion(kit, req.params.qId, req.body)));
kitsRouter.post("/:id/questions", validateBody(addQuestionSchema), mutateAndSave((kit, req) => addQuestion(kit, req.body)));
kitsRouter.delete("/:id/questions/:qId", mutateAndSave((kit, req) => deleteQuestion(kit, req.params.qId)));
kitsRouter.post(
  "/:id/questions/reorder",
  validateBody(reorderQuestionsSchema),
  mutateAndSave((kit, req) => reorderQuestions(kit, req.body.category, req.body.order))
);

kitsRouter.patch("/:id/flashcards/:cardId", validateBody(editFlashcardSchema), mutateAndSave((kit, req) => editFlashcard(kit, req.params.cardId, req.body)));
kitsRouter.post("/:id/flashcards", validateBody(addFlashcardSchema), mutateAndSave((kit, req) => addFlashcard(kit, req.body)));
kitsRouter.delete("/:id/flashcards/:cardId", mutateAndSave((kit, req) => deleteFlashcard(kit, req.params.cardId)));

kitsRouter.post(
  "/:id/practice",
  validateBody(practiceAttemptSchema),
  asyncHandler(async (req, res) => {
    const doc = await loadOwnedKit(req.userId!, req.params.id);
    doc.practiceAttempts.push({ flashcard_id: req.body.flashcard_id, confidence: req.body.confidence, at: new Date() });
    await doc.save();
    res.status(201).json({ ok: true });
  })
);

kitsRouter.get(
  "/:id/practice/session",
  asyncHandler(async (req, res) => {
    const doc = await loadOwnedKit(req.userId!, req.params.id);
    if (!doc.kit) throw new HttpError(409, "KIT_NOT_READY", "This kit has not finished generating yet");
    const kit = doc.kit as Kit;

    const latestConfidence = new Map<string, number>();
    for (const attempt of doc.practiceAttempts) {
      latestConfidence.set(attempt.flashcard_id, attempt.confidence);
    }
    const mustRequirementIds = new Set(kit.role.requirements.filter((r) => r.priority === "must").map((r) => r.id));

    const ordered = [...kit.flashcards].sort((a, b) => {
      const confA = latestConfidence.get(a.id) ?? 0; // never-practised sorts first (lowest confidence)
      const confB = latestConfidence.get(b.id) ?? 0;
      if (confA !== confB) return confA - confB;
      const mustA = a.requirement_ids.some((id) => mustRequirementIds.has(id)) ? 0 : 1;
      const mustB = b.requirement_ids.some((id) => mustRequirementIds.has(id)) ? 0 : 1;
      return mustA - mustB;
    });

    res.json({
      order: ordered.map((f) => f.id),
      covered: Array.from(latestConfidence.keys()),
      totalCards: kit.flashcards.length,
      latestConfidence: Object.fromEntries(latestConfidence),
    });
  })
);
