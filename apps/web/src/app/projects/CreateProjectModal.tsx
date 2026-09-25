'use client';

import { useState } from 'react';
import {
  CHARACTER_TEMPLATES,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  type Project,
  type ProjectStatus,
} from '@squad/core';
import { createProject, updateProject } from '@/lib/api';

type Props = {
  project?: Project;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreateProjectModal({ project, onClose, onSuccess }: Props) {
  const isEdit = Boolean(project);
  const [loading, setLoading] = useState(false);
  const [characterId, setCharacterId] = useState(project?.characterId ?? '');
  const [title, setTitle] = useState(project?.title ?? '');
  const [summary, setSummary] = useState(project?.summary ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active');
  const [nextAction, setNextAction] = useState(project?.nextAction ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!characterId || !title) return;

    setLoading(true);
    try {
      const payload = {
        characterId,
        title,
        summary,
        status,
        nextAction,
        updatedLabel: 'Just now',
      };
      if (project) {
        await updateProject(project.id, payload);
      } else {
        await createProject(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(`Failed to ${isEdit ? 'update' : 'create'} project:`, err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md border border-white/10">
        <h2 className="text-xl font-bold text-[#e2d9f3] mb-4">
          {isEdit ? 'Edit Project' : 'Create New Project'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] text-white/60 mb-1">Assign to Character</label>
            <select
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[13px] text-[#e2d9f3] focus:outline-none focus:border-white/30"
              required
            >
              <option value="">Select character...</option>
              {CHARACTER_TEMPLATES.map((t) => (
                <option key={t.characterId} value={t.characterId}>
                  {t.name} ({t.title})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-white/60 mb-1">Project Title</label>
            <input
              type="text"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[13px] text-[#e2d9f3] focus:outline-none focus:border-white/30"
              placeholder="e.g., API Refactor"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-white/60 mb-1">Summary</label>
            <textarea
              value={summary}
              maxLength={MAX_TEXT_LENGTH}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[13px] text-[#e2d9f3] focus:outline-none focus:border-white/30 resize-none"
              rows={3}
              placeholder="Brief description of the project..."
            />
          </div>

          <div>
            <label className="block text-[11px] text-white/60 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[13px] text-[#e2d9f3] focus:outline-none focus:border-white/30"
            >
              <option value="active">Active</option>
              <option value="review">In Review</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-white/60 mb-1">Next Action</label>
            <input
              type="text"
              value={nextAction}
              maxLength={MAX_TEXT_LENGTH}
              onChange={(e) => setNextAction(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[13px] text-[#e2d9f3] focus:outline-none focus:border-white/30"
              placeholder="e.g., Implement endpoint"
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 text-white/70 rounded-lg text-[13px] hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !characterId || !title}
              className="flex-1 px-4 py-2 bg-[#6ee7b7] text-[#1a1a2e] rounded-lg text-[13px] font-bold hover:bg-[#5ad4a0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save Project'
                  : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
