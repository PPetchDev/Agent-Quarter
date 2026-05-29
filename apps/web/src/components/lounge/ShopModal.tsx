"use client";
import { useState } from "react";
import { FURNITURE_CATALOG, type CatalogItem } from "./furnitureCatalog";

type Category = "all" | "essential" | "decor" | "entertainment" | "wall";

interface Props {
  open: boolean;
  coins: number;
  onClose: () => void;
  onPurchase: (item: CatalogItem) => void;
}

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: "all",           label: "All",           icon: "🛍" },
  { id: "essential",     label: "Essentials",    icon: "🏠" },
  { id: "entertainment", label: "Entertainment", icon: "🎮" },
  { id: "decor",         label: "Decor",         icon: "🪴" },
  { id: "wall",          label: "Wall",          icon: "🖼" },
];

export function ShopModal({ open, coins, onClose, onPurchase }: Props) {
  const [category, setCategory] = useState<Category>("all");
  const [feedback, setFeedback] = useState<{ id: string; type: "success" | "fail"; text: string } | null>(null);

  if (!open) return null;

  const items = category === "all"
    ? FURNITURE_CATALOG
    : FURNITURE_CATALOG.filter((c) => c.category === category);

  const handleBuy = (item: CatalogItem) => {
    if (coins < item.cost) {
      setFeedback({ id: item.type + Date.now(), type: "fail", text: "Not enough coins!" });
      setTimeout(() => setFeedback(null), 1500);
      return;
    }
    onPurchase(item);
    setFeedback({ id: item.type + Date.now(), type: "success", text: `+1 ${item.label}` });
    setTimeout(() => setFeedback(null), 1500);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[min(680px,92vw)] max-h-[88vh] rounded-3xl border-2 border-[#c8a870] bg-[#fdf6e8] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#e8d4a8] bg-[#f5e4c0] px-5 py-3 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <span className="text-[22px]">🏪</span>
            <h2 className="text-[15px] font-black text-[#5a3c18]">Furniture Shop</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full bg-[#fde68a] px-3 py-1 shadow-sm">
              <span className="text-[14px]">🪙</span>
              <span className="text-[12px] font-black text-[#7a5000]">{coins.toLocaleString()}</span>
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

        {/* Categories */}
        <div className="flex gap-1 border-b border-[#e8d4a8] bg-[#fdf6e8] px-4 py-2 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap transition ${
                category === cat.id
                  ? "bg-[#f5c518] text-[#5a3c00] shadow"
                  : "bg-[#e8d0a0]/50 text-[#8b5e30] hover:bg-[#e8d0a0]"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-y-auto px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => {
            const canAfford = coins >= item.cost;
            return (
              <div
                key={item.type}
                className={`rounded-2xl border-2 p-3 transition ${
                  canAfford ? "border-[#c8a870] bg-[#fff8e8]" : "border-[#d4b880] bg-[#f0e4d0] opacity-70"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[24px]">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-black text-[#5a3c18] truncate">{item.label}</div>
                    <div className="text-[8px] text-[#8b5e30] uppercase tracking-wide">{item.category}</div>
                  </div>
                </div>
                <p className="text-[9px] text-[#7a5030] leading-snug mb-2 line-clamp-2 min-h-[1.5em]">
                  {item.description}
                </p>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold text-[#5a3c18]">😊 +{item.happiness}</span>
                  <span className="text-[10px] font-bold text-[#7a5000]">🪙 {item.cost}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford}
                  className={`w-full rounded-xl py-1.5 text-[10px] font-black transition active:scale-95 ${
                    canAfford
                      ? "bg-[#f5c518] text-[#5a3c00] hover:bg-[#e8b800]"
                      : "bg-[#d4b880] text-[#8b5e30] cursor-not-allowed"
                  }`}
                >
                  {canAfford ? "Buy" : "Need coins"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div className={`mx-auto mb-3 rounded-full px-4 py-1.5 text-[11px] font-black shadow ${
            feedback.type === "success" ? "bg-[#86efac] text-[#0a5a20]" : "bg-[#fca5a5] text-[#7f1d1d]"
          }`}>
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
}
