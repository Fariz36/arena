"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import {
  addCriteriaAction,
  createQuestionAction,
  type AddCriteriaActionState,
  type CreateQuestionActionState,
} from "@/features/questions/actions";
import ImageUploadDropzone from "@/features/questions/components/image-upload-dropzone";

type Difficulty = "easy" | "medium" | "hard";

type AnswerOption = {
  id: number;
  text: string;
  isCorrect: boolean;
};

type CriteriaOption = {
  id: string;
  name: string;
};

type QuestionFormProps = {
  initialCriteriaOptions: CriteriaOption[];
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;

const CREATE_INITIAL_STATE: CreateQuestionActionState = {
  error: null,
  success: null,
};

const ADD_CRITERIA_INITIAL_STATE: AddCriteriaActionState = {
  error: null,
  success: null,
  criteria: null,
};

export default function QuestionForm({ initialCriteriaOptions }: QuestionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputClass =
    "w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/20";
  const labelClass = "space-y-1.5 text-sm";
  const labelTextClass = "font-semibold tracking-tight text-slate-200";

  const [title, setTitle] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [criteriaId, setCriteriaId] = useState("");
  const [criteriaOptions, setCriteriaOptions] = useState<CriteriaOption[]>(initialCriteriaOptions);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(20);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [showAddCriteria, setShowAddCriteria] = useState(false);
  const [newCriteriaName, setNewCriteriaName] = useState("");
  const [criteriaState, setCriteriaState] = useState<AddCriteriaActionState>(ADD_CRITERIA_INITIAL_STATE);

  const [options, setOptions] = useState<AnswerOption[]>([
    { id: 1, text: "", isCorrect: true },
    { id: 2, text: "", isCorrect: false },
  ]);

  const [createState, createFormAction, createPending] = useActionState(
    async (_prevState: CreateQuestionActionState, formData: FormData) => {
      const result = await createQuestionAction(_prevState, formData);
      if (result.success) {
        formRef.current?.reset();
        setTitle("");
        setQuestionText("");
        setDifficulty("easy");
        setCriteriaId("");
        setTimeLimitSeconds(20);
        setImageFile(null);
        setIsActive(false);
        setOptions([
          { id: 1, text: "", isCorrect: true },
          { id: 2, text: "", isCorrect: false },
        ]);
      }

      return result;
    },
    CREATE_INITIAL_STATE,
  );
  const [isAddingCriteria, startAddCriteriaTransition] = useTransition();

  const optionsJson = useMemo(
    () => JSON.stringify(options.map((option) => ({ text: option.text, isCorrect: option.isCorrect }))),
    [options],
  );

  function updateOptionText(id: number, value: string) {
    setOptions((prev) => prev.map((option) => (option.id === id ? { ...option, text: value } : option)));
  }

  function setCorrectOption(id: number) {
    setOptions((prev) => prev.map((option) => ({ ...option, isCorrect: option.id === id })));
  }

  function addOption() {
    setOptions((prev) => {
      if (prev.length >= MAX_OPTIONS) {
        return prev;
      }

      const nextId = Math.max(...prev.map((option) => option.id)) + 1;
      return [...prev, { id: nextId, text: "", isCorrect: false }];
    });
  }

  function removeOption(id: number) {
    setOptions((prev) => {
      if (prev.length <= MIN_OPTIONS) {
        return prev;
      }

      const next = prev.filter((option) => option.id !== id);
      if (!next.some((option) => option.isCorrect)) {
        next[0] = { ...next[0], isCorrect: true };
      }
      return next;
    });
  }

  function handleAddCriteria() {
    const formData = new FormData();
    formData.set("criteriaName", newCriteriaName);

    startAddCriteriaTransition(async () => {
      const result = await addCriteriaAction(formData);
      setCriteriaState(result);
      if (!result.criteria) {
        return;
      }

      setCriteriaOptions((prev) => {
        const exists = prev.some((option) => option.id === result.criteria?.id);
        if (exists) {
          return prev;
        }

        const next = [...prev, result.criteria as CriteriaOption];
        next.sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });

      setCriteriaId(result.criteria.id);
      setShowAddCriteria(false);
      setNewCriteriaName("");
    });
  }

  return (
    <form
      ref={formRef}
      action={createFormAction}
      className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/30 p-4 backdrop-blur-sm sm:p-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          <span className={labelTextClass}>Title</span>
          <input
            required
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Criteria</span>
          <select
            required
            name="criteriaId"
            value={criteriaId}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "__add_new__") {
                setShowAddCriteria(true);
                return;
              }
              setShowAddCriteria(false);
              setCriteriaId(value);
            }}
            className={inputClass}
          >
            <option value="">Select criteria</option>
            {criteriaOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
            <option value="__add_new__">+ Add new criteria...</option>
          </select>
        </label>

        {showAddCriteria ? (
          <div className="space-y-2 md:col-span-2">
            <div className="flex flex-wrap gap-2">
              <input
                value={newCriteriaName}
                onChange={(event) => setNewCriteriaName(event.target.value)}
                placeholder="New criteria name"
                className={`${inputClass} min-w-60 flex-1`}
                required
              />
              <button
                type="button"
                onClick={handleAddCriteria}
                disabled={isAddingCriteria}
                className="rounded-xl border border-white/25 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-300/60 hover:bg-indigo-400/10 disabled:opacity-60"
              >
                {isAddingCriteria ? "Adding..." : "Add Criteria"}
              </button>
            </div>
            {criteriaState.error ? <p className="text-sm text-red-300">{criteriaState.error}</p> : null}
            {criteriaState.success ? <p className="text-sm text-emerald-300">{criteriaState.success}</p> : null}
          </div>
        ) : null}

        <label className={labelClass}>
          <span className={labelTextClass}>Difficulty</span>
          <select
            name="difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            className={inputClass}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Time Limit (seconds)</span>
          <input
            type="number"
            min={5}
            max={120}
            required
            name="timeLimitSeconds"
            value={timeLimitSeconds}
            onChange={(event) => setTimeLimitSeconds(Number(event.target.value))}
            className={inputClass}
          />
        </label>

        <label className={`${labelClass} md:col-span-2`}>
          <span className={labelTextClass}>Image Upload (optional)</span>
          <ImageUploadDropzone
            inputName="imageFile"
            selectedFileName={imageFile?.name ?? null}
            onFileSelect={(nextFile) => {
              setImageFile(nextFile);
            }}
          />
        </label>
      </div>

      <label className={labelClass}>
        <span className={labelTextClass}>Question Text (Markdown supported)</span>
        <textarea
          required
          rows={5}
          name="questionText"
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          className={inputClass}
        />
      </label>

      <input type="hidden" name="optionsJson" value={optionsJson} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Answer Options</h2>
          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= MAX_OPTIONS}
            className="rounded-xl border border-white/25 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-indigo-300/60 hover:bg-indigo-400/10 disabled:opacity-50"
          >
            Add Option
          </button>
        </div>

        <div className="space-y-2">
          {options.map((option, index) => (
            <div
              key={option.id}
              className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-[auto,1fr,auto] md:items-center"
            >
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="correctOption"
                  checked={option.isCorrect}
                  onChange={() => setCorrectOption(option.id)}
                />
                Correct
              </label>

              <input
                required
                value={option.text}
                onChange={(event) => updateOptionText(option.id, event.target.value)}
                placeholder={`Option ${index + 1}`}
                className={inputClass}
              />

              <button
                type="button"
                onClick={() => removeOption(option.id)}
                disabled={options.length <= MIN_OPTIONS}
                className="rounded-xl border border-white/25 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-rose-300/60 hover:bg-rose-400/10 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          name="isActive"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Set question as active after creation
      </label>

      {createState.error ? <p className="text-sm text-red-300">{createState.error}</p> : null}
      {createState.success ? <p className="text-sm text-emerald-300">{createState.success}</p> : null}

      <button
        type="submit"
        disabled={createPending}
        className="rounded-xl border border-indigo-400/40 bg-gradient-to-br from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(79,70,229,0.35)] transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-60"
      >
        {createPending ? "Saving..." : "Save Question"}
      </button>
    </form>
  );
}
