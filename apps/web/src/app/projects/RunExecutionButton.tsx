"use client";

import { useEffect, useState } from "react";
import { executeRunDev, type ExecuteRunDevResult } from "../../lib/api";

export const READ_ONLY_EXECUTION_PROMPT =
  "Read-only UI-triggered execution smoke. Do not modify files. Inspect the project briefly and reply with one short status sentence.";

export type RunExecutionButtonStatus =
  | { kind: "idle" }
  | { kind: "started"; message: string }
  | { kind: "error"; message: string };

export type RunExecutionButtonControllerInput = {
  runId: string;
  isPending: () => boolean;
  setPending: (pending: boolean) => void;
  setStatus: (status: RunExecutionButtonStatus) => void;
  execute?: typeof executeRunDev;
};

/**
 * Checks if the local Codex UI is enabled.
 * Uses direct process.env references so Next.js can inline the values at build time.
 * Accepts an optional env object for testing purposes.
 */
export function isLocalCodexUiEnabled(env?: {
  NODE_ENV?: string;
  NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI?: string;
}): boolean {
  const nodeEnv = env?.NODE_ENV ?? process.env.NODE_ENV;
  const flag = env?.NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI ?? process.env.NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI;
  return nodeEnv !== "production" && flag === "true";
}

/**
 * Determines if the run execution button should be shown.
 * Uses direct process.env references so Next.js can inline the values at build time.
 * Accepts an optional env object for testing purposes.
 */
export function shouldShowRunExecutionButton(
  runId: string | undefined,
  env?: {
    NODE_ENV?: string;
    NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI?: string;
  },
): boolean {
  return Boolean(runId) && isLocalCodexUiEnabled(env);
}

export function getRunExecutionButtonLabel(isPending: boolean): string {
  return isPending ? "Starting..." : "Dev: Run read-only";
}

export function formatRunExecutionError(result: Extract<ExecuteRunDevResult, { ok: false }>): string {
  const message = result.message.replace(/\s+/g, " ").slice(0, 120);
  return result.status ? `${result.status}: ${message}` : message;
}

export function createRunExecutionClickHandler({
  runId,
  isPending,
  setPending,
  setStatus,
  execute = executeRunDev,
}: RunExecutionButtonControllerInput): () => Promise<void> {
  return async () => {
    if (isPending()) return;

    setPending(true);
    setStatus({ kind: "idle" });

    const result = await execute(runId, READ_ONLY_EXECUTION_PROMPT);

    if (result.ok) {
      setStatus({ kind: "started", message: "Execution started" });
    } else {
      setStatus({
        kind: "error",
        message: `Could not start execution: ${formatRunExecutionError(result)}`,
      });
    }

    setPending(false);
  };
}

type RunExecutionButtonProps = {
  runId: string;
};

export function RunExecutionButton({ runId }: RunExecutionButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<RunExecutionButtonStatus>({ kind: "idle" });

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !shouldShowRunExecutionButton(runId)) return null;

  const handleClick = createRunExecutionClickHandler({
    runId,
    isPending: () => pending,
    setPending,
    setStatus,
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-full border border-[#6ee7b7]/30 bg-[#6ee7b7]/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#6ee7b7] transition-colors hover:bg-[#6ee7b7]/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {getRunExecutionButtonLabel(pending)}
      </button>
      {status.kind !== "idle" && (
        <span
          className={`max-w-[11rem] text-right text-[8px] ${
            status.kind === "started" ? "text-[#6ee7b7]" : "text-[#f87171]"
          }`}
        >
          {status.message}
        </span>
      )}
    </div>
  );
}