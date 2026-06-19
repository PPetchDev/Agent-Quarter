import { SupplyPanel } from '@squad/web';

const noop = () => {};

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      position: 'relative',
      width: 560,
      height: 520,
      background: '#17122e',
      borderRadius: 16,
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

export function Stocked() {
  return (
    <Stage>
      <SupplyPanel open coins={1240} food={26800} depletionLabel="2h 14m" onClose={noop} onFeed={noop} />
    </Stage>
  );
}

export function NearlyEmpty() {
  return (
    <Stage>
      <SupplyPanel open coins={420} food={1800} depletionLabel="6m" onClose={noop} onFeed={noop} />
    </Stage>
  );
}
