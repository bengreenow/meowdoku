interface Coat {
  fur: string;
  dark: string;
  ear: string;
  eye: string;
  pattern: "stripes" | "plain" | "calico" | "tuxedo" | "points" | "bicolour";
}

const COATS: Coat[] = [
  { fur: "#f39441", dark: "#c45f1c", ear: "#ffb3a8", eye: "#7fd16b", pattern: "stripes" },
  { fur: "#2b2233", dark: "#140e1a", ear: "#ff8fb1", eye: "#ffd84a", pattern: "plain" },
  { fur: "#fbf6ef", dark: "#f0873a", ear: "#ffa8be", eye: "#6fc3ff", pattern: "calico" },
  { fur: "#9b97ad", dark: "#6c6884", ear: "#ffb0c4", eye: "#ffc94a", pattern: "stripes" },
  { fur: "#2b2233", dark: "#fbf6ef", ear: "#ff8fb1", eye: "#9be36b", pattern: "tuxedo" },
  { fur: "#f2dcae", dark: "#4b3328", ear: "#e8a08a", eye: "#5fb8ff", pattern: "points" },
  { fur: "#8d5d3f", dark: "#5a3824", ear: "#f6a99a", eye: "#c8e86b", pattern: "stripes" },
  { fur: "#fbf6ef", dark: "#f39441", ear: "#ffa8be", eye: "#8bd16b", pattern: "bicolour" },
  { fur: "#6f7fa8", dark: "#53618a", ear: "#f7b2c8", eye: "#ffb44a", pattern: "plain" },
  { fur: "#f3d6a4", dark: "#d4a462", ear: "#ffb3a8", eye: "#6fd1a8", pattern: "stripes" },
  { fur: "#fbf6ef", dark: "#cfc7d8", ear: "#ffa8be", eye: "#6fc3ff", pattern: "plain" },
];

const HEAD = "M10 27 L12 6 L26 17 Q32 15 38 17 L52 6 L54 27 Q59 35 55 44 Q50 57 32 58 Q14 57 9 44 Q5 35 10 27 Z";
const INK = "#1c1029";

function markings(coat: Coat): string {
  switch (coat.pattern) {
    case "stripes":
      return `<path d="M32 18 L32 25 M25 19 L27 25 M39 19 L37 25 M9.5 36 L15 37 M9.5 41 L15 41 M54.5 36 L49 37 M54.5 41 L49 41" stroke="${coat.dark}" stroke-width="2.6" stroke-linecap="round"/>`;
    case "calico":
      return `<path d="M12 9 L26 17 Q22 25 13 27 Z" fill="${coat.dark}"/><path d="M52 7 L54 27 Q47 28 40 20 L38 17 Z" fill="${INK}"/><ellipse cx="17" cy="48" rx="6" ry="4" fill="${coat.dark}" opacity=".9"/>`;
    case "tuxedo":
      return `<path d="M32 30 Q22 36 21 46 Q24 56 32 57 Q40 56 43 46 Q42 36 32 30 Z" fill="${coat.dark}"/>`;
    case "points":
      return `<path d="M12 7 L24 16 L14 22 Z M52 7 L40 16 L50 22 Z" fill="${coat.dark}"/><ellipse cx="32" cy="45" rx="11" ry="9" fill="${coat.dark}" opacity=".85"/>`;
    case "bicolour":
      return `<path d="M10 27 L12 6 L26 17 Q30 16 32 16 L32 30 Q20 30 9.5 34 Z" fill="${coat.dark}"/>`;
    default:
      return "";
  }
}

export function catSvg(variant = 1): string {
  const coat = COATS[variant % COATS.length];
  const darkFace = coat.fur === "#2b2233";
  const eyeInk = darkFace ? "#f3e6f6" : INK;
  const lineInk = darkFace && coat.pattern !== "tuxedo" ? "#f3e6f6" : INK;
  return `<svg viewBox="-4 -4 72 72" aria-hidden="true" class="cat">
  <path d="${HEAD}" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>
  <path d="${HEAD}" fill="${coat.fur}"/>
  ${markings(coat)}
  <path d="M15 12 L23 18 L16 23 Z M49 12 L41 18 L48 23 Z" fill="${coat.ear}"/>
  <ellipse cx="17" cy="44" rx="4" ry="2.4" fill="#ff7fa8" opacity=".55"/>
  <ellipse cx="47" cy="44" rx="4" ry="2.4" fill="#ff7fa8" opacity=".55"/>
  <g class="eyes">
    <ellipse cx="23" cy="35" rx="5.4" ry="6.4" fill="${coat.eye}"/>
    <ellipse cx="41" cy="35" rx="5.4" ry="6.4" fill="${coat.eye}"/>
    <ellipse cx="23.6" cy="36" rx="2.3" ry="4.6" fill="${INK}"/>
    <ellipse cx="40.4" cy="36" rx="2.3" ry="4.6" fill="${INK}"/>
    <circle cx="25" cy="32.6" r="1.5" fill="#fff"/>
    <circle cx="42.4" cy="32.6" r="1.5" fill="#fff"/>
  </g>
  <g class="happy" stroke="${eyeInk}" stroke-width="2.6" fill="none" stroke-linecap="round">
    <path d="M18 37 Q23 30 28 37 M36 37 Q41 30 46 37"/>
  </g>
  <path d="M29.5 43 L34.5 43 L32 46 Z" fill="${coat.ear}" stroke="${lineInk}" stroke-width=".8" stroke-linejoin="round"/>
  <path d="M32 46 Q29.5 50 26.5 48.5 M32 46 Q34.5 50 37.5 48.5" stroke="${lineInk}" stroke-width="1.7" fill="none" stroke-linecap="round"/>
  <path d="M3 39 L16 41 M3 45 L16 44 M61 39 L48 41 M61 45 L48 44" stroke="${eyeInk}" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>
</svg>`;
}

/** The logo cat sits behind the wordmark; its paws are a separate layer in front so they hook over the letters. */
export function peekingCatSvg(): string {
  const head = catSvg(0).replace(/<svg[^>]*>|<\/svg>/g, "");
  return `<svg viewBox="-4 -4 72 66" aria-hidden="true" class="peek-cat">${head}</svg>`;
}

export function peekingPawsSvg(): string {
  const paw = (x: number) =>
    `<g transform="translate(${x} 8)"><ellipse rx="9" ry="7" fill="#fff"/><ellipse rx="6.6" ry="4.6" fill="#f39441"/><path d="M-2.4 -4 L-2.4 -0.6 M2.4 -4 L2.4 -0.6" stroke="#c45f1c" stroke-width="1.3" stroke-linecap="round"/></g>`;
  return `<svg viewBox="0 0 80 16" aria-hidden="true" class="peek-paws">${paw(14)}${paw(66)}</svg>`;
}

export const fishSvg = `<svg viewBox="-3 -3 46 30" aria-hidden="true" class="fish">
  <path d="M4 12 Q14 1 26 6 L36 1 L33 12 L36 23 L26 18 Q14 23 4 12 Z" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
  <path class="fish-body" d="M4 12 Q14 1 26 6 L36 1 L33 12 L36 23 L26 18 Q14 23 4 12 Z"/>
  <path d="M17 7 Q20 12 17 17 M22 7.5 Q25 12 22 16.5" stroke="${INK}" stroke-width="1.4" fill="none" opacity=".35" stroke-linecap="round"/>
  <circle cx="10.5" cy="10.5" r="1.8" fill="${INK}"/>
</svg>`;

export const crossSvg = `<svg viewBox="0 0 24 24" aria-hidden="true" class="cross">
  <path d="M7 7 L17 17 M17 7 L7 17" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
</svg>`;

export const pawSvg = `<svg viewBox="0 0 32 32" aria-hidden="true" class="paw">
  <ellipse cx="16" cy="21" rx="7.5" ry="6.5" fill="currentColor"/>
  <ellipse cx="7" cy="13" rx="3" ry="3.8" fill="currentColor"/>
  <ellipse cx="12.5" cy="7.5" rx="3" ry="3.8" fill="currentColor"/>
  <ellipse cx="19.5" cy="7.5" rx="3" ry="3.8" fill="currentColor"/>
  <ellipse cx="25" cy="13" rx="3" ry="3.8" fill="currentColor"/>
</svg>`;
