import { ShopModal } from '@squad/web';

const noop = () => {};

// ShopModal is an `absolute inset-0` overlay — give it a positioned, sized stage
// so it renders contained (centered over a darkened backdrop) inside the card.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      position: 'relative',
      width: 700,
      height: 560,
      background: '#17122e',
      borderRadius: 16,
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

export function Open() {
  return (
    <Stage>
      <ShopModal open coins={1240} tokens={8} onClose={noop} onPurchase={noop} />
    </Stage>
  );
}

export function LowFunds() {
  return (
    <Stage>
      <ShopModal open coins={60} tokens={0} onClose={noop} onPurchase={noop} />
    </Stage>
  );
}
