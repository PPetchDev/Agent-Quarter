'use client';
import { FOOD_CAP, FOOD_ITEMS, type FoodItem } from '@/game/dorm/dormEngine';

interface Props {
  open: boolean;
  coins: number;
  food: number;
  /** Formatted countdown until the food gauge empties. */
  depletionLabel: string;
  onClose: () => void;
  onFeed: (item: FoodItem) => void;
}

/** Azur Lane style dorm supply panel: buy + feed food items into the gauge. */
export function SupplyPanel({ open, coins, food, depletionLabel, onClose, onFeed }: Props) {
  if (!open) return null;

  const foodPct = Math.round((food / FOOD_CAP) * 100);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[min(520px,92vw)] max-h-[84vh] rounded-3xl border-2 border-[#c8a870] bg-[#fdf6e8] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#e8d4a8] bg-[#f5e4c0] px-5 py-3 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <span className="text-[22px]">🍱</span>
            <h2 className="text-[15px] font-black text-[#5a3c18]">Dorm Supplies</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full bg-[#fde68a] px-3 py-1 shadow-sm">
              <span className="text-[14px]">🪙</span>
              <span className="text-[12px] font-black text-[#7a5000]">
                {coins.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8d0a0] text-[#8b5e30] hover:bg-[#d4b880] text-[14px] font-bold transition active:scale-95"
            >
              ×
            </button>
          </div>
        </div>

        {/* Food gauge */}
        <div className="px-5 py-3 border-b border-[#e8d4a8]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-black text-[#5a3c18]">Food</span>
            <span className="ml-auto text-[10px] font-mono font-bold text-[#2a7a30] tabular-nums">
              {depletionLabel}
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#e8d0a0]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#e84040] transition-all"
              style={{ width: `${foodPct}%` }}
            />
          </div>
          <div className="mt-0.5 text-right text-[9px] font-bold text-[#5a3c18] tabular-nums">
            {Math.round(food).toLocaleString()}/{FOOD_CAP.toLocaleString()}
          </div>
        </div>

        {/* Food items */}
        <div className="overflow-y-auto px-4 py-3 grid grid-cols-2 gap-3">
          {FOOD_ITEMS.map((item) => {
            const canAfford = coins >= item.cost;
            const gaugeFull = food >= FOOD_CAP;
            const disabled = !canAfford || gaugeFull;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border-2 p-3 transition ${
                  disabled
                    ? 'border-[#d4b880] bg-[#f0e4d0] opacity-70'
                    : 'border-[#c8a870] bg-[#fff8e8]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[24px]">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-black text-[#5a3c18] truncate">
                      {item.label}
                    </div>
                    <div className="text-[9px] font-bold text-[#2a7a30]">
                      🍙 +{item.food.toLocaleString()}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#7a5000]">🪙 {item.cost}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onFeed(item)}
                  disabled={disabled}
                  className={`w-full rounded-xl py-1.5 text-[10px] font-black transition active:scale-95 ${
                    disabled
                      ? 'bg-[#d4b880] text-[#8b5e30] cursor-not-allowed'
                      : 'bg-[#f5c518] text-[#5a3c00] hover:bg-[#e8b800]'
                  }`}
                >
                  {gaugeFull ? 'Gauge full' : canAfford ? 'Feed' : 'Need coins'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
