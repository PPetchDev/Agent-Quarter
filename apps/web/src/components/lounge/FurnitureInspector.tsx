'use client';
import type { RoomObject } from './roomDefs';

interface Props {
  object: RoomObject | null;
  onClose: () => void;
  onMoveMode: () => void;
  onDelete: (id: number) => void;
}

const FURNITURE_ICONS: Record<string, string> = {
  bed: '🛏',
  nightstand: '🪔',
  tv_stand: '📺',
  tv: '📺',
  bookcase: '📚',
  pool_table: '🎱',
  low_table: '🍵',
  zabuton: '🪑',
  plant: '🪴',
  hanging_scroll: '🖼',
  wall_shelf: '📦',
};

export function FurnitureInspector({ object, onClose, onMoveMode, onDelete }: Props) {
  if (!object) return null;

  const icon = FURNITURE_ICONS[object.furnitureType] ?? '🪑';
  const posLabel = `(${object.wx.toFixed(1)}, ${object.wy.toFixed(1)})`;

  return (
    <div
      className="absolute left-1/2 bottom-[6.5rem] z-40 w-64 -translate-x-1/2 rounded-2xl border border-[#c8a870] bg-[#fdf6e8]/95 shadow-xl backdrop-blur-sm"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 rounded-t-2xl border-b border-[#e8d4a8] bg-[#f5e4c0] px-3 py-2">
        <span className="text-[20px]">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-black text-[#5a3c18] truncate">{object.label}</div>
          <div className="text-[9px] text-[#8b5e30]">pos {posLabel}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8d0a0] text-[#8b5e30] hover:bg-[#d4b880] transition text-[12px] font-bold flex-shrink-0"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-2">
        {object.description && (
          <p className="text-[10px] text-[#7a5030] leading-relaxed">{object.description}</p>
        )}

        {/* Happiness bonus */}
        <div className="flex items-center gap-1.5">
          <span className="text-[12px]">😊</span>
          <span className="text-[10px] font-bold text-[#5a3c18]">
            Happiness +{object.happiness}
          </span>
        </div>

        {/* Draggable indicator */}
        {object.draggable && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">✋</span>
            <span className="text-[10px] text-[#8b5e30]">Draggable furniture</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-[#e8d4a8] px-3 py-2 flex gap-2">
        {object.draggable && (
          <button
            type="button"
            onClick={() => {
              onMoveMode();
              onClose();
            }}
            className="flex-1 rounded-xl bg-[#f5c518] py-1.5 text-[10px] font-black text-[#5a3c00] hover:bg-[#e8b800] active:scale-95 transition"
          >
            Move
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onDelete(object.id);
            onClose();
          }}
          className="flex-1 rounded-xl border border-[#e84040] bg-[#fcd5d5] py-1.5 text-[10px] font-black text-[#9b1c1c] hover:bg-[#fab8b8] active:scale-95 transition"
        >
          🗑 Delete
        </button>
      </div>
    </div>
  );
}
