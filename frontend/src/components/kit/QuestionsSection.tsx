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
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Kit, Question, QuestionCategory } from "@/lib/types";
import { useAddQuestion, useDeleteQuestion, useEditQuestion, useReorderQuestions, useRegenerateSection } from "@/lib/hooks/useKit";
import { Button, Card, PinIcon, inputClass } from "@/components/ui";
import { EditableField } from "./EditableField";

const CATEGORIES: { key: QuestionCategory; label: string }[] = [
  { key: "technical", label: "Technical" },
  { key: "behavioural", label: "Behavioural" },
  { key: "system-design", label: "System design" },
  { key: "company-fit", label: "Company fit" },
];

export function QuestionsSection({ kitId, kit }: { kitId: string; kit: Kit }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Questions</h2>
      {CATEGORIES.map(({ key, label }) => (
        <QuestionCategoryBlock key={key} kitId={kitId} kit={kit} category={key} label={label} />
      ))}
    </div>
  );
}

function QuestionCategoryBlock({
  kitId,
  kit,
  category,
  label,
}: {
  kitId: string;
  kit: Kit;
  category: QuestionCategory;
  label: string;
}) {
  const questions = kit.questions.filter((q) => q.category === category);
  const reorder = useReorderQuestions(kitId);
  const regenerate = useRegenerateSection(kitId);
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const order = questions.map((q) => q.id);
    [order[index], order[target]] = [order[target], order[index]];
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

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">
          {label} <span className="text-sm font-normal text-slate-400">({questions.length})</span>
        </h3>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAdding((a) => !a)}>
            {adding ? "Cancel" : "Add question"}
          </Button>
          <Button
            variant="secondary"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate({ section: `questions:${category}` })}
          >
            {regenerate.isPending ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>
      </div>

      {regenerate.isSuccess && regenerate.submittedAt && !regenerate.isPending && (
        <RegenerateNote applied={regenerate.data?.applied} />
      )}

      {adding && <AddQuestionForm kitId={kitId} kit={kit} category={category} onDone={() => setAdding(false)} />}

      {questions.length === 0 ? (
        <p className="text-sm text-slate-400">No questions in this category yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {questions.map((q, i) => (
                <SortableQuestionCard
                  key={q.id}
                  kitId={kitId}
                  kit={kit}
                  question={q}
                  index={i}
                  count={questions.length}
                  onMove={move}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </Card>
  );
}

function RegenerateNote({ applied }: { applied?: boolean }) {
  if (applied) return null;
  return (
    <p className="text-xs text-amber-600 dark:text-amber-400">
      Every question here was edited, added by hand, or pinned, so regeneration didn&apos;t replace anything.
    </p>
  );
}

function SortableQuestionCard({
  kitId,
  kit,
  question,
  index,
  count,
  onMove,
}: {
  kitId: string;
  kit: Kit;
  question: Question;
  index: number;
  count: number;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <li ref={setNodeRef} style={style}>
      <QuestionCard kitId={kitId} kit={kit} question={question} index={index} count={count} onMove={onMove} dragHandleProps={{ ...attributes, ...listeners }} />
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
}: {
  kitId: string;
  kit: Kit;
  question: Question;
  index: number;
  count: number;
  onMove: (index: number, direction: -1 | 1) => void;
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const edit = useEditQuestion(kitId);
  const del = useDeleteQuestion(kitId);

  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            {...dragHandleProps}
            aria-label={`Drag to reorder "${question.prompt.slice(0, 30)}"`}
            className="cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ⠿
          </button>
          <div className="flex flex-col">
            <button
              type="button"
              aria-label="Move up"
              disabled={index === 0}
              onClick={() => onMove(index, -1)}
              className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
            >
              ▲
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={index === count - 1}
              onClick={() => onMove(index, 1)}
              className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
            >
              ▼
            </button>
          </div>
          <span className="text-xs text-slate-400">Difficulty</span>
          <select
            value={question.difficulty}
            onChange={(e) => edit.mutate({ qId: question.id, patch: { difficulty: Number(e.target.value) } })}
            className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            {[1, 2, 3].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-pressed={question.pinned}
            aria-label={question.pinned ? "Unpin question" : "Pin question"}
            onClick={() => edit.mutate({ qId: question.id, patch: { pinned: !question.pinned } })}
            className={`rounded p-1 ${question.pinned ? "text-amber-500" : "text-slate-300 hover:text-slate-500"}`}
          >
            <PinIcon filled={question.pinned} />
          </button>
          <button
            type="button"
            aria-label="Delete question"
            onClick={() => del.mutate({ qId: question.id })}
            className="rounded p-1 text-slate-300 hover:text-red-500"
          >
            ✕
          </button>
        </div>
      </div>

      <EditableField
        ariaLabel="Question prompt"
        value={question.prompt}
        onSave={(v) => edit.mutate({ qId: question.id, patch: { prompt: v } })}
        multiline
      />
      <div className="mt-2">
        <span className="mb-1 block text-xs text-slate-400">Answer outline</span>
        <EditableField
          ariaLabel="Answer outline"
          value={question.answer_outline}
          onSave={(v) => edit.mutate({ qId: question.id, patch: { answer_outline: v } })}
          multiline
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

function RequirementPicker({
  selected,
  requirements,
  onChange,
}: {
  selected: string[];
  requirements: Kit["role"]["requirements"];
  onChange: (ids: string[]) => void;
}) {
  if (requirements.length === 0) return null;
  return (
    <fieldset className="mt-2">
      <legend className="mb-1 text-xs text-slate-400">Covers requirement(s)</legend>
      <div className="flex flex-wrap gap-2">
        {requirements.map((r) => {
          const checked = selected.includes(r.id);
          return (
            <label
              key={r.id}
              className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs ${
                checked
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-300 text-slate-500 dark:border-slate-700"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onChange(checked ? selected.filter((id) => id !== r.id) : [...selected, r.id])}
              />
              {r.id}
            </label>
          );
        })}
      </div>
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
  const [prompt, setPrompt] = useState("");
  const [answerOutline, setAnswerOutline] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [requirementIds, setRequirementIds] = useState<string[]>([]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    add.mutate(
      { category, prompt, answer_outline: answerOutline, difficulty, requirement_ids: requirementIds },
      { onSuccess: onDone }
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-md border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <input
        aria-label="New question prompt"
        required
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Question prompt"
        className={inputClass}
      />
      <input
        aria-label="New question answer outline"
        value={answerOutline}
        onChange={(e) => setAnswerOutline(e.target.value)}
        placeholder="Answer outline (optional)"
        className={inputClass}
      />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-sm">
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}
            className="rounded border border-slate-300 bg-white px-1 py-0.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {[1, 2, 3].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={add.isPending}>
          Add
        </Button>
      </div>
      <RequirementPicker selected={requirementIds} requirements={kit.role.requirements} onChange={setRequirementIds} />
    </form>
  );
}
