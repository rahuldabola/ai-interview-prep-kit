"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Kit, Question, QuestionCategory } from "@/lib/types";
import {
  useAddQuestion,
  useDeleteQuestion,
  useEditQuestion,
  useRegenerateSection,
  useReorderQuestions,
} from "@/lib/hooks/useKit";
import { useToast } from "@/components/Toaster";
import { Button, DifficultyBadge, Field, IconButton, OriginBadge, inputClass } from "@/components/ui";
import { EditableField } from "./EditableField";
import { PinButton, RegenerationNotice, SectionCard, selectClass } from "./SectionCard";

const CATEGORIES: { key: QuestionCategory; label: string; blurb: string }[] = [
  { key: "technical", label: "Technical", blurb: "Built from the technical and domain requirements in the posting." },
  { key: "behavioural", label: "Behavioural", blurb: "Built from the behavioural requirements in the posting." },
  {
    key: "system-design",
    label: "System design",
    blurb: "Informed by whatever the crawl found about their interview format.",
  },
  { key: "company-fit", label: "Company fit", blurb: "Grounded in the company brief." },
];

const DIFFICULTY_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Hard" },
];

export function QuestionsSection({ kitId, kit }: { kitId: string; kit: Kit }) {
  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Question bank</h2>
        <span className="text-sm text-ink-muted">{kit.questions.length} questions</span>
      </div>
      {CATEGORIES.map((category) => (
        <QuestionCategoryBlock
          key={category.key}
          kitId={kitId}
          kit={kit}
          category={category.key}
          label={category.label}
          blurb={category.blurb}
        />
      ))}
    </div>
  );
}

function QuestionCategoryBlock({
  kitId,
  kit,
  category,
  label,
  blurb,
}: {
  kitId: string;
  kit: Kit;
  category: QuestionCategory;
  label: string;
  blurb: string;
}) {
  const questions = kit.questions.filter((q) => q.category === category);
  const reorder = useReorderQuestions(kitId);
  const regenerate = useRegenerateSection(kitId);
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const order = questions.map((q) => q.id);
    [order[index], order[target]] = [order[target]!, order[index]!];
    reorder.mutate({ category, order });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const order = questions.map((q) => q.id);
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    order.splice(to, 0, order.splice(from, 1)[0]!);
    reorder.mutate({ category, order });
  }

  function onRegenerate() {
    regenerate.mutate(
      { section: `questions:${category}` },
      {
        onSuccess: (data) =>
          toast(
            data.applied
              ? `${label} questions regenerated.`
              : `Nothing to regenerate — every ${label.toLowerCase()} question is pinned or edited.`,
            data.applied ? "success" : "info"
          ),
        onError: (err) => toast(err.message || "Could not regenerate these questions.", "error"),
      }
    );
  }

  return (
    <SectionCard
      title={label}
      count={questions.length}
      subtitle={blurb}
      actions={
        <>
          <Button variant={adding ? "ghost" : "secondary"} size="sm" onClick={() => setAdding((a) => !a)}>
            {adding ? "Cancel" : "Add question"}
          </Button>
          <Button variant="secondary" size="sm" onClick={onRegenerate} loading={regenerate.isPending}>
            Regenerate
          </Button>
        </>
      }
    >
      {regenerate.isSuccess && !regenerate.isPending && <RegenerationNotice applied={regenerate.data.applied} />}

      {adding && <AddQuestionForm kitId={kitId} kit={kit} category={category} onDone={() => setAdding(false)} />}

      {questions.length === 0 ? (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-muted">
          No questions in this category.{" "}
          {category === "system-design"
            ? "That is expected for non-engineering roles."
            : "Try regenerating, or add one by hand."}
        </p>
      ) : (
        <>
          <p className="text-xs text-ink-subtle">
            Drag to reorder, or use the arrows — both work with the keyboard. Order is the order you will practise in.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-3">
                {questions.map((question, i) => (
                  <SortableQuestionCard
                    key={question.id}
                    kitId={kitId}
                    kit={kit}
                    question={question}
                    index={i}
                    count={questions.length}
                    onMove={move}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      )}
    </SectionCard>
  );
}

function SortableQuestionCard(props: {
  kitId: string;
  kit: Kit;
  question: Question;
  index: number;
  count: number;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.question.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <QuestionCard {...props} dragHandleProps={{ ...attributes, ...listeners }} dragging={isDragging} />
    </li>
  );
}

function QuestionCard({
  kitId,
  kit,
  question,
  index,
  count,
  onMove,
  dragHandleProps,
  dragging,
}: {
  kitId: string;
  kit: Kit;
  question: Question;
  index: number;
  count: number;
  onMove: (index: number, direction: -1 | 1) => void;
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
  dragging?: boolean;
}) {
  const edit = useEditQuestion(kitId);
  const del = useDeleteQuestion(kitId);
  const { toast } = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function onDelete() {
    del.mutate(
      { qId: question.id },
      {
        onSuccess: () => toast("Question deleted.", "success"),
        onError: (err) => toast(err.message || "Could not delete that question.", "error"),
      }
    );
  }

  return (
    <div
      className={`rounded-xl border bg-surface p-3 transition-shadow ${
        dragging ? "border-brand shadow-lg" : "border-line"
      }`}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            {...dragHandleProps}
            aria-label={`Reorder: ${question.prompt.slice(0, 40)}`}
            title="Drag to reorder"
            className="cursor-grab touch-none rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink active:cursor-grabbing"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <circle cx="7.5" cy="5" r="1.3" />
              <circle cx="12.5" cy="5" r="1.3" />
              <circle cx="7.5" cy="10" r="1.3" />
              <circle cx="12.5" cy="10" r="1.3" />
              <circle cx="7.5" cy="15" r="1.3" />
              <circle cx="12.5" cy="15" r="1.3" />
            </svg>
          </button>

          {/* The always-visible arrows are the non-drag keyboard path, so reordering never
              requires a pointer. */}
          <div className="flex flex-col">
            <IconButton
              label="Move up"
              disabled={index === 0}
              onClick={() => onMove(index, -1)}
              className="!p-0.5"
            >
              <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
            <IconButton
              label="Move down"
              disabled={index === count - 1}
              onClick={() => onMove(index, 1)}
              className="!p-0.5"
            >
              <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          </div>

          <span className="ml-1 text-xs font-medium text-ink-subtle">#{index + 1}</span>
          <DifficultyBadge difficulty={question.difficulty} />
          <OriginBadge origin={question.origin} />
        </div>

        <div className="flex items-center gap-1">
          <label className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <span className="sr-only sm:not-sr-only">Difficulty</span>
            <select
              value={question.difficulty}
              onChange={(e) => edit.mutate({ qId: question.id, patch: { difficulty: Number(e.target.value) } })}
              aria-label="Question difficulty"
              className={selectClass}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <PinButton
            pinned={question.pinned}
            onToggle={() => edit.mutate({ qId: question.id, patch: { pinned: !question.pinned } })}
            what="this question"
          />
          {confirmingDelete ? (
            <span className="flex items-center gap-1">
              <Button variant="danger" size="sm" onClick={onDelete} loading={del.isPending}>
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <IconButton
              label="Delete this question"
              onClick={() => setConfirmingDelete(true)}
              className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7}>
                <path d="M4 6h12M8 6V4.5h4V6M6.5 6l.5 9.5h6l.5-9.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          )}
        </div>
      </div>

      <EditableField
        ariaLabel="Question prompt"
        value={question.prompt}
        onSave={(v) => edit.mutate({ qId: question.id, patch: { prompt: v } })}
        multiline
        rows={2}
        className="font-medium"
      />

      <div className="mt-2.5">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          How to answer
        </span>
        <EditableField
          ariaLabel="Answer outline"
          value={question.answer_outline}
          onSave={(v) => edit.mutate({ qId: question.id, patch: { answer_outline: v } })}
          multiline
          rows={3}
        />
      </div>

      <RequirementPicker
        selected={question.requirement_ids}
        requirements={kit.role.requirements}
        onChange={(ids) => edit.mutate({ qId: question.id, patch: { requirement_ids: ids } })}
      />
    </div>
  );
}

/**
 * Requirement links were previously shown as bare ids ("r1", "r4"), which tell the user
 * nothing about what the question actually covers. Showing the requirement text makes the
 * link auditable — and it drives the coverage check, so getting it right matters.
 */
function RequirementPicker({
  selected,
  requirements,
  onChange,
}: {
  selected: string[];
  requirements: Kit["role"]["requirements"];
  onChange: (ids: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (requirements.length === 0) return null;

  const selectedRequirements = requirements.filter((r) => selected.includes(r.id));

  return (
    <fieldset className="mt-3 border-t border-line pt-2.5">
      <legend className="sr-only">Requirements covered by this question</legend>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Covers</span>
        {selectedRequirements.length === 0 ? (
          <span className="text-xs text-amber-700 dark:text-amber-400">nothing yet</span>
        ) : (
          selectedRequirements.map((req) => (
            <span
              key={req.id}
              className="max-w-xs truncate rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand"
              title={req.text}
            >
              {req.text}
            </span>
          ))
        )}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {expanded ? "Done" : "Change"}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1.5 rounded-lg bg-surface-muted/50 p-2.5">
          {requirements.map((req) => {
            const checked = selected.includes(req.id);
            return (
              <label key={req.id} className="flex cursor-pointer items-start gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? selected.filter((id) => id !== req.id) : [...selected, req.id])}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--brand)]"
                />
                <span className="text-balance-pretty">
                  {req.text}
                  <span className="ml-1 text-ink-subtle">({req.priority === "must" ? "must" : "nice"})</span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

function AddQuestionForm({
  kitId,
  kit,
  category,
  onDone,
}: {
  kitId: string;
  kit: Kit;
  category: QuestionCategory;
  onDone: () => void;
}) {
  const add = useAddQuestion(kitId);
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [answerOutline, setAnswerOutline] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [requirementIds, setRequirementIds] = useState<string[]>([]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    add.mutate(
      {
        category,
        prompt: prompt.trim(),
        answer_outline: answerOutline.trim(),
        difficulty,
        requirement_ids: requirementIds,
      },
      {
        onSuccess: () => {
          toast("Question added and pinned.", "success");
          onDone();
        },
        onError: (err) => toast(err.message || "Could not add that question.", "error"),
      }
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-fade-up space-y-3 rounded-xl border border-dashed border-brand-ring bg-brand-soft/30 p-3.5"
    >
      <Field label="Question" htmlFor="new-question-prompt">
        <textarea
          id="new-question-prompt"
          required
          rows={2}
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What do you want to be asked?"
          className={inputClass}
        />
      </Field>

      <Field label="How to answer" htmlFor="new-question-outline" hint="Optional — notes to yourself for later.">
        <textarea
          id="new-question-outline"
          rows={2}
          value={answerOutline}
          onChange={(e) => setAnswerOutline(e.target.value)}
          placeholder="Key points to hit…"
          className={inputClass}
        />
      </Field>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}
            className={selectClass}
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={add.isPending} disabled={!prompt.trim()}>
            Add question
          </Button>
        </div>
      </div>

      <RequirementPicker selected={requirementIds} requirements={kit.role.requirements} onChange={setRequirementIds} />
    </form>
  );
}
