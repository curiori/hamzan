import { useId, type ReactNode } from "react";
import { REWARDS } from "@/lib/rewards";

// Original hamster character + room goods, drawn as inline SVG.

export type Mood = "idle" | "happy" | "oops" | "cheer";

const FUR = "#E99A4E";
const CREAM = "#FFF4E2";
const PINK = "#F6B8AE";
const INK = "#3A2A20";

function Seed({ x, y, r = -18, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <ellipse rx="4.2" ry="7.2" fill="#3F3A36" />
      <path d="M0 -6 V6 M-2.2 -4 Q-2.8 0 -1.6 4.5 M2.2 -4 Q2.8 0 1.6 4.5" stroke="#F3EBDD" strokeWidth="0.9" fill="none" />
    </g>
  );
}

const sparkle = "M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z";

export function HamsterBody({ mood = "idle", wear = null }: { mood?: Mood; wear?: string | null }) {
  const glad = mood === "happy" || mood === "cheer";
  return (
    <g>
      <circle cx="30" cy="30" r="12" fill={FUR} />
      <circle cx="90" cy="30" r="12" fill={FUR} />
      <circle cx="30" cy="31" r="6.5" fill={PINK} />
      <circle cx="90" cy="31" r="6.5" fill={PINK} />
      <ellipse cx="40" cy="103" rx="10" ry="5" fill={PINK} />
      <ellipse cx="80" cy="103" rx="10" ry="5" fill={PINK} />
      <ellipse cx="60" cy="63" rx="46" ry="42" fill={FUR} />
      <path d="M20 70 C 24 47, 96 47, 100 70 C 98 98, 22 98, 20 70 Z" fill={CREAM} />
      {glad ? (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M38 52 Q44 45 50 52" />
          <path d="M70 52 Q76 45 82 52" />
        </g>
      ) : (
        <g>
          <circle cx="44" cy="51" r={mood === "oops" ? 4.5 : 5.5} fill={INK} />
          <circle cx="76" cy="51" r={mood === "oops" ? 4.5 : 5.5} fill={INK} />
          <circle cx="45.6" cy="49.2" r="1.7" fill="#fff" />
          <circle cx="77.6" cy="49.2" r="1.7" fill="#fff" />
        </g>
      )}
      <ellipse cx="31" cy="66" rx="8" ry="5" fill="#F59E9E" opacity=".75" />
      <ellipse cx="89" cy="66" rx="8" ry="5" fill="#F59E9E" opacity=".75" />
      <ellipse cx="60" cy="60" rx="3.4" ry="2.4" fill="#E07A7A" />
      {mood === "oops" ? (
        <ellipse cx="60" cy="68" rx="2.8" ry="3.4" fill={INK} />
      ) : mood === "cheer" ? (
        <path d="M53 65 Q60 77 67 65 Z" fill="#B4432B" />
      ) : (
        <path d="M54 64 Q57 68 60 64 Q63 68 66 64" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      )}
      {mood === "cheer" ? (
        <g fill={PINK}>
          <ellipse cx="13" cy="40" rx="7" ry="5.5" />
          <ellipse cx="107" cy="40" rx="7" ry="5.5" />
        </g>
      ) : (
        <g>
          {mood !== "oops" && <Seed x={60} y={83} r={-8} />}
          <ellipse cx="50" cy="86" rx="7" ry="5" fill={PINK} />
          <ellipse cx="70" cy="86" rx="7" ry="5" fill={PINK} />
        </g>
      )}
      {mood === "oops" && <path d="M101 22 C 106 30, 106 34, 101 36 C 96 34, 96 30, 101 22 Z" fill="#7CC4F5" />}
      {glad && (
        <g fill="#F5B700">
          <path d={sparkle} transform="translate(8 14)" />
          <path d={sparkle} transform="translate(112 16) scale(.8)" />
        </g>
      )}
      {wear === "hachimaki" && (
        <g>
          <path d="M100 29 L115 21 L112 34 Z M100 34 L114 43 L104 45 Z" fill="#fff" stroke="#D1D5DB" />
          <rect x="17" y="25" width="86" height="12" rx="5" fill="#fff" stroke="#D1D5DB" />
          <text x="60" y="34.5" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#DC2626">合格</text>
        </g>
      )}
      {wear === "crown" && (
        <g>
          <path d="M42 24 L42 9 L51 16 L60 3 L69 16 L78 9 L78 24 Z" fill="#F5C518" stroke="#B8860B" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="60" cy="17" r="2.6" fill="#DC2626" />
          <circle cx="49" cy="20" r="1.8" fill="#2563EB" />
          <circle cx="71" cy="20" r="1.8" fill="#2563EB" />
        </g>
      )}
    </g>
  );
}

export function Hamster({ mood = "idle", wear = null, className }: { mood?: Mood; wear?: string | null; className?: string }) {
  return (
    <svg viewBox="-6 -4 132 114" className={className} aria-hidden="true">
      <HamsterBody mood={mood} wear={wear} />
    </svg>
  );
}

export function SeedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2C16.6 6.2 17.6 13.4 12 22C6.4 13.4 7.4 6.2 12 2Z" className="fill-stone-800 dark:fill-stone-200" />
      <path
        d="M12 5.5V19M9.6 8.5Q9 13 10.6 17M14.4 8.5Q15 13 13.4 17"
        className="stroke-stone-100 dark:stroke-stone-700"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Paw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <ellipse cx="12" cy="15.5" rx="5.2" ry="4.4" />
      <circle cx="5.8" cy="9.6" r="2.1" />
      <circle cx="9.8" cy="6.4" r="2.1" />
      <circle cx="14.2" cy="6.4" r="2.1" />
      <circle cx="18.2" cy="9.6" r="2.1" />
    </svg>
  );
}

// Goods drawn in a 60×60 box.
const ART: Record<string, ReactNode> = {
  bowl: (
    <g>
      <ellipse cx="30" cy="46" rx="24" ry="8" fill="#DCE7F2" stroke="#8FA8C0" strokeWidth="2" />
      <ellipse cx="30" cy="42" rx="19" ry="5" fill="#F6E7C8" />
      <Seed x={23} y={41} r={70} s={0.6} />
      <Seed x={33} y={40} r={-60} s={0.6} />
      <Seed x={29} y={43} r={15} s={0.6} />
      <Seed x={38} y={43} r={80} s={0.6} />
    </g>
  ),
  wheel: (
    <g>
      <path d="M30 30 L14 58 M30 30 L46 58" stroke="#8B6B4A" strokeWidth="4" strokeLinecap="round" />
      <g className="origin-center [transform-box:fill-box] motion-safe:animate-[spin_8s_linear_infinite]">
        <circle cx="30" cy="28" r="24" fill="none" stroke="#4E9BD1" strokeWidth="4" />
        <circle cx="30" cy="28" r="19" fill="none" stroke="#9CCBEA" strokeWidth="3" strokeDasharray="3 4" />
        <path d="M30 4 V52 M6 28 H54 M13 11 L47 45 M47 11 L13 45" stroke="#4E9BD1" strokeWidth="1.5" />
      </g>
      <circle cx="30" cy="28" r="3" fill="#2F6E99" />
    </g>
  ),
  house: (
    <g>
      <rect x="8" y="26" width="44" height="30" rx="2" fill="#D39A62" />
      <path d="M12 34 H48 M12 42 H22 M38 42 H48 M12 50 H22 M38 50 H48" stroke="#B57D47" strokeWidth="1.2" />
      <path d="M4 29 L30 6 L56 29 Z" fill="#9C6234" />
      <path d="M23 56 V44 A7 7 0 0 1 37 44 V56 Z" fill="#5C3A1E" />
    </g>
  ),
  tunnel: (
    <g>
      <path d="M4 56 A26 26 0 0 1 56 56 Z" fill="#7DBB7A" />
      <path d="M15 56 A15 15 0 0 1 45 56 Z" fill="#2F4F2E" opacity=".75" />
      <path d="M8 50 A22 22 0 0 1 20 34 M40 34 A22 22 0 0 1 52 50" stroke="#A9D6A6" strokeWidth="2" fill="none" />
    </g>
  ),
  hachimaki: (
    <g>
      <path d="M46 25 L58 17 L56 30 Z M46 32 L57 40 L49 42 Z" fill="#fff" stroke="#D1D5DB" />
      <rect x="3" y="21" width="47" height="15" rx="6" fill="#fff" stroke="#D1D5DB" />
      <text x="26.5" y="32.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#DC2626">合格</text>
    </g>
  ),
  desk: (
    <g>
      <rect x="11" y="10" width="7" height="22" fill="#4C78A8" />
      <rect x="19" y="13" width="6" height="19" fill="#E45756" />
      <rect x="26" y="8" width="8" height="24" fill="#54A24B" />
      <rect x="36" y="14" width="6" height="18" fill="#F2C14E" transform="rotate(12 39 23)" />
      <rect x="4" y="32" width="52" height="6" rx="1.5" fill="#A0703F" />
      <rect x="8" y="38" width="5" height="20" fill="#8A5E33" />
      <rect x="47" y="38" width="5" height="20" fill="#8A5E33" />
    </g>
  ),
  flower: (
    <g>
      <path d="M30 46 V22" stroke="#3F8F3A" strokeWidth="3" />
      <ellipse cx="23" cy="36" rx="7" ry="3.5" fill="#4CA64C" transform="rotate(-25 23 36)" />
      <ellipse cx="37" cy="33" rx="7" ry="3.5" fill="#4CA64C" transform="rotate(25 37 33)" />
      {Array.from({ length: 10 }, (_, i) => (
        <ellipse key={i} cx="30" cy="7" rx="3" ry="6" fill="#F7C531" transform={`rotate(${i * 36} 30 16)`} />
      ))}
      <circle cx="30" cy="16" r="5.5" fill="#6B4423" />
      <path d="M19 44 H41 L38 58 H22 Z" fill="#C8643C" />
    </g>
  ),
  swing: (
    <g>
      <path d="M14 0 V44 M46 0 V44" stroke="#8B6B4A" strokeWidth="2" />
      <rect x="8" y="44" width="44" height="7" rx="3" fill="#D39A62" stroke="#9C6234" />
    </g>
  ),
  hammock: (
    <g>
      <path d="M4 6 L14 22 M56 6 L46 22" stroke="#8B6B4A" strokeWidth="2" />
      <path d="M12 20 Q30 46 48 20 Q30 34 12 20 Z" fill="#E87D7D" />
      <path d="M16 24 Q30 38 44 24" stroke="#F7B4B4" strokeWidth="2" fill="none" />
    </g>
  ),
  crown: (
    <g>
      <path d="M8 46 L8 18 L20 30 L30 10 L40 30 L52 18 L52 46 Z" fill="#F5C518" stroke="#B8860B" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="30" cy="34" r="4" fill="#DC2626" />
      <circle cx="17" cy="38" r="2.6" fill="#2563EB" />
      <circle cx="43" cy="38" r="2.6" fill="#2563EB" />
    </g>
  ),
};

export function ItemThumb({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden="true">
      {ART[id]}
    </svg>
  );
}

// Back-to-front drawing order and placement [x, y, scale] in the 400×220 room.
const SPOTS: [string, number, number, number][] = [
  ["hammock", 330, 6, 1.1],
  ["swing", 248, 0, 1.15],
  ["flower", 170, 43, 0.75],
  ["desk", 10, 104, 1.35],
  ["wheel", 92, 82, 1.5],
  ["house", 300, 92, 1.5],
  ["tunnel", 12, 166, 0.95],
  ["bowl", 284, 170, 0.8],
];

export function RoomScene({
  owned,
  wear,
  mood = "idle",
  name,
  className,
}: {
  owned: string[];
  wear: string | null;
  mood?: Mood;
  name: string;
  className?: string;
}) {
  const titleId = useId();
  const descId = useId();
  const goods = REWARDS.filter((i) => owned.includes(i.id) && !i.wear);
  return (
    <svg viewBox="0 0 400 220" className={className} role="img" aria-labelledby={`${titleId} ${descId}`}>
      <title id={titleId}>{`${name}のおへや`}</title>
      <desc id={descId}>{goods.length ? `${goods.map((g) => g.name).join("、")}があります` : "グッズはまだありません"}</desc>
      <rect width="400" height="220" fill="#FBF1DF" />
      <rect x="150" y="22" width="92" height="66" rx="6" fill="#BFE3F7" stroke="#D9B57A" strokeWidth="4" />
      <circle cx="222" cy="40" r="8" fill="#FFD25A" />
      <path d="M196 22 V88 M150 55 H242" stroke="#D9B57A" strokeWidth="3" />
      <rect x="144" y="86" width="104" height="7" rx="2" fill="#D9B57A" />
      <rect y="160" width="400" height="60" fill="#EFD3A0" />
      <path d="M0 160 H400" stroke="#D9B57A" strokeWidth="2" />
      <path d="M30 202 l8 -2 M96 190 l7 2 M150 206 l9 -1 M232 212 l8 1 M336 198 l7 -2 M372 212 l8 1 M200 180 l6 2" stroke="#D9B57A" strokeWidth="2" strokeLinecap="round" />
      {SPOTS.filter(([id]) => owned.includes(id)).map(([id, x, y, s]) => (
        <g key={id} transform={`translate(${x} ${y}) scale(${s})`}>
          {ART[id]}
        </g>
      ))}
      <g transform="translate(190 124) scale(0.7)">
        <HamsterBody mood={mood} wear={wear} />
      </g>
    </svg>
  );
}
