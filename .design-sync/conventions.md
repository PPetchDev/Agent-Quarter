# Anime Agent Squad — UI components

A small set of presentational React components carved from the `@squad/web` game
(an anime-styled multi-agent "lounge"). They are **self-contained**: no theme
provider, context, or router is required — load the bundle and render.

## Access

Every component is on the global the bundle assigns: `window.SquadWeb.<Name>`
(bundle is the root `_ds_bundle.js`). The four components are `MessageBubble`,
`ShopModal`, `SupplyPanel`, `FurnitureInspector`. Read each `<Name>.d.ts` for the
exact prop contract and `<Name>.prompt.md` for usage before composing.

## Two surfaces, two palettes

There is no shared theme object and no exported class map — you do not add classes
*to* these components, you pass props. Style your own surrounding layout with the
same Tailwind idiom and match whichever surface the component belongs to:

- **Chat layer** — `MessageBubble`. Colors are tuned for a **dark** backdrop;
  place it on a dark panel (`#0e0a24`, the app uses `#07041a`) or the bubbles
  lose contrast. Bubble text is `#e2d9f3`, the streaming accent is `#f0abfc`.
- **Dorm / shop layer** — `ShopModal`, `SupplyPanel`, `FurnitureInspector`. A warm
  cream theme: panels `#fdf6e8`, action buttons `#f5c518` (yellow), borders
  `#c8a870`. These read fine on any background since they paint their own panel.

## Overlays need a positioned, sized parent

`ShopModal` and `SupplyPanel` render `absolute inset-0` (full-bleed overlay);
`FurnitureInspector` is an `absolute` bottom-anchored popover. Each escapes to the
page viewport unless you wrap it in a `position: relative` ancestor with an
explicit size. All three also gate on a visibility prop and render **nothing**
until it is set: `open={true}` for the modals, a non-null `object` for the
inspector.

## Styling idiom

Tailwind CSS v3 utilities, used heavily with **arbitrary values**
(`bg-[#fdf6e8]`, `text-[12px]`, `w-[min(680px,92vw)]`, `rounded-3xl`,
`backdrop-blur-sm`). The compiled utility stylesheet ships as `_ds_bundle.css` and
is reachable from `styles.css`. Use the same arbitrary-value idiom for your own
layout glue rather than inventing a class system.

## Example

```tsx
const { MessageBubble, ShopModal } = window.SquadWeb;

// Chat bubble on a dark panel
<div style={{ background: '#0e0a24', padding: 16, borderRadius: 16, width: 360 }}>
  <MessageBubble role="assistant" characterName="Yui" content="พร้อมช่วยแล้วค่ะ!" />
</div>

// Modal overlay inside a relative, sized stage
<div style={{ position: 'relative', width: 700, height: 560 }}>
  <ShopModal open coins={1240} tokens={8} onClose={() => {}} onPurchase={() => {}} />
</div>
```
