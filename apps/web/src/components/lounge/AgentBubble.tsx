'use client';

import type { CSSProperties } from 'react';

/** Props for the universal agent speech bubble */
export type AgentBubbleProps = {
    /** Text to display inside the bubble */
    text: string;
    /** Absolute left position in CSS pixels (relative to overlay) */
    left: number;
    /** Absolute top position in CSS pixels (relative to overlay) */
    top: number;
    /** Visual style preset */
    variant?: 'agent' | 'ambient' | 'dialogue';
    /** Extra CSS class overrides */
    className?: string;
    /** Inline style overrides (merged with computed) */
    style?: CSSProperties;
};

const VARIANT_STYLES: Record<
    NonNullable<AgentBubbleProps['variant']>,
    { base: string; tail: string }
> = {
    agent: {
        base: 'max-w-[160px] rounded-2xl bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-lg',
        tail: 'border-t-white/95',
    },
    ambient: {
        base: 'rounded-full border border-[#ffb6c1] bg-white/90 px-3 py-1 text-[10px] font-bold text-[#8b4c6e] shadow-md',
        tail: '',
    },
    dialogue: {
        base: 'max-w-[180px] rounded-2xl bg-[#f5f3ff]/95 px-3 py-1.5 text-[11px] font-semibold text-[#5b21b6] shadow-lg border border-[#ddd6fe]/60',
        tail: 'border-t-[#f5f3ff]/95',
    },
};

/**
 * Universal speech bubble positioned absolutely inside the lounge overlay.
 *
 * Centered horizontally above the anchor point, with a small tail
 * pointing down to the character.
 */
export function AgentBubble({
    text,
    left,
    top,
    variant = 'agent',
    className = '',
    style,
}: AgentBubbleProps) {
    const styles = VARIANT_STYLES[variant];

    const hasTail = variant !== 'ambient';

    return (
        <div
            className={`absolute pointer-events-none z-20 whitespace-nowrap ${styles.base} ${className}`}
            style={{
                left,
                top,
                transform: 'translate(-50%, -100%)',
                ...style,
            }}
        >
            {text}
            {hasTail && (
                <span
                    className={`pointer-events-none absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent ${styles.tail}`}
                />
            )}
        </div>
    );
}
