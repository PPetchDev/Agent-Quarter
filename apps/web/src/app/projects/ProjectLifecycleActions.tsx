'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, Run } from '@squad/core';
import { startTask, completeRun, failRun, cancelRun } from '@/lib/api';

type Props = {
  task: Task | undefined;
  latestRun: Run | undefined;
};

export function ProjectLifecycleActions({ task, latestRun }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleStartTask(taskId: string) {
    setLoading(`start-${taskId}`);
    try {
      await startTask(taskId);
      router.refresh();
    } catch {
      // error silently — API will return appropriate status
    } finally {
      setLoading(null);
    }
  }

  async function handleCompleteRun(runId: string) {
    setLoading(`complete-${runId}`);
    try {
      await completeRun(runId);
      router.refresh();
    } catch {
      // error silently
    } finally {
      setLoading(null);
    }
  }

  async function handleFailRun(runId: string) {
    setLoading(`fail-${runId}`);
    try {
      await failRun(runId);
      router.refresh();
    } catch {
      // error silently
    } finally {
      setLoading(null);
    }
  }

  async function handleCancelRun(runId: string) {
    setLoading(`cancel-${runId}`);
    try {
      await cancelRun(runId);
      router.refresh();
    } catch {
      // error silently
    } finally {
      setLoading(null);
    }
  }

  const btnBase =
    'text-[9px] font-bold px-2 py-0.5 rounded-full border transition disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {/* Start Task button — only for todo tasks */}
      {task?.status === 'todo' && (
        <button
          className={`${btnBase} text-[#6ee7b7] border-[#6ee7b7]/30 bg-[#6ee7b7]/10 hover:bg-[#6ee7b7]/20`}
          disabled={loading !== null}
          onClick={() => handleStartTask(task!.id)}
        >
          {loading === `start-${task.id}` ? '···' : '▶ Start'}
        </button>
      )}

      {/* Run lifecycle buttons — only for pending/running runs */}
      {latestRun && (latestRun.status === 'pending' || latestRun.status === 'running') && (
        <>
          <button
            className={`${btnBase} text-[#6ee7b7] border-[#6ee7b7]/30 bg-[#6ee7b7]/10 hover:bg-[#6ee7b7]/20`}
            disabled={loading !== null}
            onClick={() => handleCompleteRun(latestRun.id)}
          >
            {loading === `complete-${latestRun.id}` ? '···' : '✅'}
          </button>
          <button
            className={`${btnBase} text-[#f87171] border-[#f87171]/30 bg-[#f87171]/10 hover:bg-[#f87171]/20`}
            disabled={loading !== null}
            onClick={() => handleFailRun(latestRun.id)}
          >
            {loading === `fail-${latestRun.id}` ? '···' : '❌'}
          </button>
          <button
            className={`${btnBase} text-white/40 border-white/20 bg-white/5 hover:bg-white/10`}
            disabled={loading !== null}
            onClick={() => handleCancelRun(latestRun.id)}
          >
            {loading === `cancel-${latestRun.id}` ? '···' : '⏹'}
          </button>
        </>
      )}
    </div>
  );
}
