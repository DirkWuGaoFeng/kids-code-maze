/**
 * icons.ts —— 全内联 SVG 图标库（统一圆润卡通风）
 * 零文字产品的核心资产：积木图标（Blockly FieldImage）+ UI 图标（按钮/地图/星星）
 * 约定：单色图标用 %c 作颜色占位；多色固定图标（星星/宝石/砖墙）自带配色。
 */

const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linejoin="round" stroke-linecap="round">${inner}</svg>`;

/** 每个图标以 %c 作为颜色占位 */
const GLYPHS: Record<string, string> = {
  // —— 动作类（积木上显示为白色）——
  fwd: `<path d="M12 3 L20 11.6 h-4.4 V19 a1.6 1.6 0 0 1 -1.6 1.6 h-4 a1.6 1.6 0 0 1 -1.6 -1.6 V11.6 H4 Z" fill="%c"/><path d="M12 3 L20 11.6 h-4.4 V13 h-7.2 v-1.4 H4 Z" fill="#fff" opacity="0.22"/>`,
  back: `<path d="M12 21 L4 12.4 h4.4 V5 a1.6 1.6 0 0 1 1.6 -1.6 h4 a1.6 1.6 0 0 1 1.6 1.6 v7.4 H20 Z" fill="%c"/><path d="M12 21 L4 12.4 h4.4 V11 h7.2 v1.4 H20 Z" fill="#fff" opacity="0.22"/>`,
  turnL: `<path d="M17 20 V14.5 a5.5 5.5 0 0 0 -5.5 -5.5 H8.5" fill="none" stroke="%c" stroke-width="3.4"/><path d="M10 5.5 L4 9.4 L10 13.3 Z" fill="%c"/>`,
  turnR: `<path d="M7 20 V14.5 a5.5 5.5 0 0 1 5.5 -5.5 h3" fill="none" stroke="%c" stroke-width="3.4"/><path d="M14 5.5 L20 9.4 L14 13.3 Z" fill="%c"/>`,
  pick: `<path d="M12 2.6 L20 8.4 L12 21.4 L4 8.4 Z" fill="%c"/><path d="M12 2.6 L20 8.4 L12 10.4 Z" fill="#fff" opacity="0.5"/><path d="M8.4 6 L12 4 L15.6 6" fill="none" stroke="#fff" stroke-width="1.1" opacity="0.5"/>`,
  turnAround: `<path d="M7.5 20 V11 a4.5 4.5 0 0 1 9 0 V16.5" fill="none" stroke="%c" stroke-width="3.2"/><path d="M16.5 21.5 L13.3 16 H19.7 Z" fill="%c"/>`,

  // —— 控制类 ——
  loop: `<path d="M18.6 11 a6.6 6.6 0 1 1 -2.6 -5.3" fill="none" stroke="%c" stroke-width="3.4"/><path d="M15.2 2.4 L20.6 5.4 L14.9 7.4 Z" fill="%c"/>`,
  eyeOK: `<path d="M2.4 12 C6.4 5.6, 17.6 5.6, 21.6 12 C17.6 18.4, 6.4 18.4, 2.4 12 Z" fill="#fff" opacity="0.9" stroke="%c" stroke-width="2.2"/><path d="M8.5 12 L11 14.5 L15.5 9.5" fill="none" stroke="%c" stroke-width="2.6"/>`,
  gemEye: `<path d="M2.4 12 C6.4 5.6, 17.6 5.6, 21.6 12 C17.6 18.4, 6.4 18.4, 2.4 12 Z" fill="#fff" opacity="0.9" stroke="%c" stroke-width="2.2"/><path d="M12 7.8 L15.4 10.6 L12 16 L8.6 10.6 Z" fill="%c"/>`,
  wallEye: `<path d="M2.4 12 C6.4 5.6, 17.6 5.6, 21.6 12 C17.6 18.4, 6.4 18.4, 2.4 12 Z" fill="#fff" opacity="0.9" stroke="%c" stroke-width="2.2"/><rect x="7.6" y="9.6" width="8.8" height="5" rx="1.2" fill="%c"/><path d="M12 9.6 v5 M7.6 12 h8.8" stroke="#fff" stroke-width="1" opacity="0.7"/>`,
  fork: `<path d="M12 21 V14 M12 14 L6.5 8.5 M12 14 L17.5 8.5" fill="none" stroke="%c" stroke-width="3"/><path d="M6.5 3 L3.6 8.6 L9.4 8.6 Z" fill="%c"/><path d="M17.5 3 L14.6 8.6 L20.4 8.6 Z" fill="%c"/>`,

  // —— 套路块（宏/封装）——
  combo: `<rect x="3.5" y="8" width="17" height="12.5" rx="2.6" fill="%c"/><rect x="3.5" y="6.4" width="17" height="4.2" rx="2" fill="%c"/><path d="M12 6.4 V20.5" stroke="#fff" stroke-width="1.8" opacity="0.85"/><path d="M9 6.4 C7 4 8.5 2.6 12 4.4 C15.5 2.6 17 4 15 6.4" fill="none" stroke="#fff" stroke-width="1.8"/>`,

  // —— 事件（触发）/ 函数（自定义动作）——
  bolt: `<path d="M13.4 2 L4.6 13.4 h5.2 l-1.2 8.6 L19.4 10 h-5.4 Z" fill="%c"/><path d="M13.4 2 L4.6 13.4 h5.2 l-.4 2.8 L15 6 h-1.6 Z" fill="#fff" opacity="0.25"/>`,
  func: `<rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.6" fill="%c"/><path d="M12 6.4 l1.55 3.25 3.55 .4 -2.66 2.45 .72 3.5 -3.16 -1.82 -3.16 1.82 .72 -3.5 -2.66 -2.45 3.55 -.4 Z" fill="#fff"/>`,
  flag: `<path d="M6 2.6 V21.4" stroke="%c" stroke-width="3.2"/><path d="M6 4 H19.5 L15 8.6 L19.5 13.2 H6 Z" fill="%c"/>`,
  times: `<path d="M6.8 6.8 L17.2 17.2 M17.2 6.8 L6.8 17.2" stroke="%c" stroke-width="3.4"/>`,

  // —— 地图/目标（自带配色）——
  star: `<path d="M12 2.4 l2.85 6.05 6.65 .78 -4.98 4.58 1.4 6.58 -5.92 -3.36 -5.92 3.36 1.4 -6.58 -4.98 -4.58 6.65 -.78 Z" fill="%c"/><path d="M12 2.4 l2.85 6.05 6.65 .78 -4.98 4.58 .4 1.9 Z" fill="#fff" opacity="0.28"/>`,
  starGray: `<path d="M12 2.4 l2.85 6.05 6.65 .78 -4.98 4.58 1.4 6.58 -5.92 -3.36 -5.92 3.36 1.4 -6.58 -4.98 -4.58 6.65 -.78 Z" fill="#d7ccc8"/>`,
  gemGold: `<path d="M12 2.4 L20.4 8.6 L12 21.4 L3.6 8.6 Z" fill="#ffc107" stroke="#ff8f00" stroke-width="1.2"/><path d="M12 2.4 L20.4 8.6 L12 10.8 Z" fill="#ffab00"/><path d="M12 2.4 L3.6 8.6 L12 10.8 Z" fill="#ffd54f"/><path d="M8 5.6 L12 4 L16 5.6" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.7"/>`,
  wallBlock: `<rect x="2.5" y="6" width="19" height="12" rx="2.2" fill="#a1786a" stroke="#6d4c41" stroke-width="1.2"/><path d="M2.5 12 H21.5 M12 6 V12 M7.2 12 V18 M16.8 12 V18" stroke="#efebe9" stroke-width="1.3" opacity="0.85"/>`,

  // —— UI 类 ——
  play: `<path d="M8 4.8 L19.5 12 L8 19.2 Z" fill="%c"/>`,
  home: `<path d="M4 11 L12 3.6 L20 11 V19 a1.4 1.4 0 0 1 -1.4 1.4 H14 V14.4 H10 V20.4 H5.4 A1.4 1.4 0 0 1 4 19 Z" fill="%c"/>`,
  lock: `<path d="M7 10.5 V8 a5 5 0 0 1 10 0 v2.5" fill="none" stroke="%c" stroke-width="2.8"/><rect x="4.8" y="10.5" width="14.4" height="10.5" rx="2.4" fill="%c"/><circle cx="12" cy="15" r="1.7" fill="#fff"/><path d="M12 15.4 V18.4" stroke="#fff" stroke-width="1.5"/>`,
  bug: `<ellipse cx="12" cy="14" rx="6" ry="6.6" fill="%c"/><circle cx="12" cy="5.6" r="3" fill="%c"/><path d="M12 8 V20" stroke="#fff" stroke-width="1.6"/><circle cx="9.4" cy="12.6" r="1.2" fill="#fff"/><circle cx="14.6" cy="12.6" r="1.2" fill="#fff"/><circle cx="9.8" cy="16.6" r="1.1" fill="#fff"/><circle cx="14.2" cy="16.6" r="1.1" fill="#fff"/><path d="M8 3.4 L6.4 1.8 M16 3.4 L17.6 1.8" stroke="%c" stroke-width="1.8"/>`,
  check: `<path d="M4 13 L9.4 19 L20 5.6" fill="none" stroke="%c" stroke-width="3.8"/>`,
  info: `<circle cx="12" cy="12" r="9.5" fill="none" stroke="%c" stroke-width="2.4"/><circle cx="12" cy="7.6" r="1.6" fill="%c"/><path d="M12 11 V17" stroke="%c" stroke-width="2.6"/>`,
  robot: `<rect x="3.5" y="6.5" width="17" height="14" rx="4.5" fill="%c"/><path d="M12 6.5 V3.6" stroke="%c" stroke-width="2.4"/><circle cx="12" cy="2.8" r="1.9" fill="#ffca28"/><rect x="6.4" y="10" width="11.2" height="5.4" rx="2.7" fill="#fff" opacity="0.92"/><circle cx="9.4" cy="12.7" r="1.5" fill="#37474f"/><circle cx="14.6" cy="12.7" r="1.5" fill="#37474f"/><path d="M8.6 17.6 h6.8" stroke="#fff" stroke-width="1.8"/>`,
};

export function icon(name: string, color = '#ffffff'): string {
  const g = GLYPHS[name];
  if (!g) throw new Error('unknown icon: ' + name);
  return wrap(g.replaceAll('%c', color));
}

/** Blockly FieldImage 用的 data-uri */
export function iconUri(name: string, color = '#ffffff'): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(icon(name, color));
}

/** 插入 DOM 的 <img> 形式 data-uri（按钮等） */
export function iconImg(name: string, color: string, size = 28): string {
  return `<img src="${iconUri(name, color)}" width="${size}" height="${size}" draggable="false"/>`;
}
