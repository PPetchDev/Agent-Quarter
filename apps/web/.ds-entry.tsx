// design-sync curated entry — exports only the standalone-renderable UI
// components from this Next.js app so esbuild bundles just these (not the
// whole app / PixiJS / socket tree). Pure presentational subset for batch 1.
export { MessageBubble } from './src/components/stages/MessageBubble';
export { ShopModal } from './src/components/lounge/ShopModal';
export { SupplyPanel } from './src/components/lounge/SupplyPanel';
export { FurnitureInspector } from './src/components/lounge/FurnitureInspector';
