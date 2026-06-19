import { FurnitureInspector } from '@squad/web';

const noop = () => {};

// FurnitureInspector is a bottom-anchored popover (`absolute bottom-[6.5rem]`) —
// give it a positioned, sized stage so it renders where it sits in the room.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      position: 'relative',
      width: 360,
      height: 430,
      background: '#17122e',
      borderRadius: 16,
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

const bed = {
  id: 1,
  furnitureType: 'bed',
  label: 'Wooden Bed',
  description: 'A cozy single bed. Characters recover morale faster while resting here.',
  wx: 4,
  wy: 6,
  wz: 0,
  happiness: 12,
  draggable: true,
};

const scroll = {
  id: 2,
  furnitureType: 'hanging_scroll',
  label: 'Hanging Scroll',
  description: 'Wall decor that lends the room a calm, focused ambiance.',
  wx: 1,
  wy: 0,
  wz: 2,
  happiness: 6,
  draggable: false,
};

export function Draggable() {
  return (
    <Stage>
      <FurnitureInspector object={bed} onClose={noop} onMoveMode={noop} onDelete={noop} />
    </Stage>
  );
}

export function FixedDecor() {
  return (
    <Stage>
      <FurnitureInspector object={scroll} onClose={noop} onMoveMode={noop} onDelete={noop} />
    </Stage>
  );
}
