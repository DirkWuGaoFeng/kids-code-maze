/**
 * storage.ts —— 纯本地多孩子档案与进度（localStorage，零后端）
 * 每个档案：头像 + 各关星级；家长=老师坐在旁边看，无独立教师端。
 */
export interface Profile {
  id: string;
  avatar: string;              // emoji 头像
  stars: Record<number, number>; // levelId -> 最好星级(0-3)
}
interface Store { current: string | null; profiles: Profile[]; }

const KEY = 'kids-code-maze:v1';
export const AVATARS = ['🐵', '🐼', '🦊', '🐯', '🐨', '🐰', '🦁', '🐷'];

function blank(): Store { return { current: null, profiles: [] }; }

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const s = JSON.parse(raw) as Store;
    return { current: s.current ?? null, profiles: s.profiles ?? [] };
  } catch { return blank(); }
}
function save(s: Store) { localStorage.setItem(KEY, JSON.stringify(s)); }

export function listProfiles(): Profile[] { return load().profiles; }
export function currentProfile(): Profile | null {
  const s = load();
  return s.profiles.find((p) => p.id === s.current) ?? null;
}
export function addProfile(): Profile {
  const s = load();
  const used = new Set(s.profiles.map((p) => p.avatar));
  const avatar = AVATARS.find((a) => !used.has(a)) ?? AVATARS[s.profiles.length % AVATARS.length];
  const p: Profile = { id: 'p' + Date.now(), avatar, stars: {} };
  s.profiles.push(p); s.current = p.id; save(s);
  return p;
}
export function selectProfile(id: string) { const s = load(); s.current = id; save(s); }
export function getStars(levelId: number): number { return currentProfile()?.stars[levelId] ?? 0; }
export function setStars(levelId: number, stars: number) {
  const s = load();
  const p = s.profiles.find((x) => x.id === s.current); if (!p) return;
  p.stars[levelId] = Math.max(p.stars[levelId] ?? 0, stars);
  save(s);
}
export function totalStars(): number {
  const p = currentProfile(); if (!p) return 0;
  return Object.values(p.stars).reduce((a, b) => a + b, 0);
}
/** 关卡是否解锁：第 1 关恒解锁，其余需前一关 ≥1 星 */
export function isUnlocked(levelId: number): boolean {
  if (levelId <= 1) return true;
  return getStars(levelId - 1) >= 1;
}
