/**
 * levels.ts —— 45 个手工关卡
 * 关键设计：参考解由折线路径"自动生成"（逐格前进+转角+拾宝石），
 * 从而"每关可解"由构造保证；checkLevels() 再跑一遍无头模拟器兜底。
 * 7 大功能章节（每章内部由简入难，关卡 id 连续）：①顺序与动作(1-9) ②循环(10-20) ③条件与分支(21-29) ④传感器(30-32) ⑤事件(33-36) ⑥函数与抽象(37-41) ⑦调试纠错(42-45)
 * "锁箱教学"：blocks 限定该关可用积木，逐步引入新概念。
 */
import { Dir } from './maze';
import { Spec, simulate, simulateEvents } from './sim';

// —— Spec 构造助手 ——
const F = (): Spec => ({ t: 'm_forward' });
const LT = (): Spec => ({ t: 'm_left' });
const RT = (): Spec => ({ t: 'm_right' });
const PK = (): Spec => ({ t: 'm_pick' });
export const rep = (n: number, body: Spec[]): Spec => ({ t: 'c_repeat_n', n, body });
export const whF = (body: Spec[]): Spec => ({ t: 'c_while_fwd', body });
export const unT = (body: Spec[]): Spec => ({ t: 'c_until_flag', body });
export const ifG = (body: Spec[]): Spec => ({ t: 'i_if_gem', body });
export const ifW = (body: Spec[]): Spec => ({ t: 'i_if_wall', body });
const ifEL = (then: Spec[], els: Spec[]): Spec => ({ t: 'i_if_else_wall_left', then, else: els });
const EW = (trigger: string, body: Spec[]): Spec => ({ t: trigger, body } as Spec);
const FNDEF = (body: Spec[]): Spec => ({ t: 'fn_def', body });
const FNCALL = (n: number): Spec => ({ t: 'fn_call', n });

export type BlockType = Spec['t'];
type Pt = [number, number];

export interface LevelDef {
  id: number;
  rows: string[];
  startDir: Dir;
  blocks: BlockType[];
  par: number;               // 3★ 所需积木上限（=自动参考解积木数）
  solution: Spec[];          // 自动生成的参考解（证明可解）
  mode: 'build' | 'debug';
  brokenProgram?: Spec[];    // debug 关初始错误程序
}

const gk = (x: number, y: number) => `${x},${y}`;
const dirBetween = (a: Pt, b: Pt): Dir => {
  if (b[0] > a[0]) return 0; if (b[1] > a[1]) return 1;
  if (b[0] < a[0]) return 2; return 3;
};
const turnsTo = (from: Dir, to: Dir): Spec[] => {
  const d = (to - from + 4) % 4;
  if (d === 0) return [];
  if (d === 1) return [RT()];
  if (d === 3) return [LT()];
  return [RT(), RT()]; // 反向
};

/** 折线 → 逐格路径（去重相邻点） */
function expandPath(path: Pt[]): Pt[] {
  const cells: Pt[] = [path[0]];
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i], [x2, y2] = path[i + 1];
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    let x = x1, y = y1;
    while (x !== x2 || y !== y2) { x += dx; y += dy; cells.push([x, y]); }
  }
  return cells;
}

/** 折线 → 地图字符串（自动补墙 + 放 S/F/g） */
function buildMaze(w: number, h: number, path: Pt[], gems: Pt[]) {
  const g: string[][] = Array.from({ length: h }, () => Array(w).fill('#'));
  const put = (x: number, y: number, c: string) => { if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; };
  for (const [x, y] of expandPath(path)) put(x, y, '.');
  for (const [x, y] of gems) put(x, y, 'g');
  const [ex, ey] = path[path.length - 1]; put(ex, ey, 'F');
  const [sx, sy] = path[0]; put(sx, sy, 'S');
  return { rows: g.map((r) => r.join('')), startDir: dirBetween(path[0], path[1]) };
}

/** 自动生成参考解：沿路径逐格走 + 转角 + 拾取脚下宝石 */
function genSolution(path: Pt[], gems: Pt[]): Spec[] {
  const cells = expandPath(path);
  const gemSet = new Set(gems.map(([x, y]) => gk(x, y)));
  const prog: Spec[] = [];
  let facing = dirBetween(path[0], path[1]);
  if (gemSet.has(gk(cells[0][0], cells[0][1]))) prog.push(PK());
  for (let k = 1; k < cells.length; k++) {
    const want = dirBetween(cells[k - 1], cells[k]);
    prog.push(...turnsTo(facing, want));
    facing = want;
    prog.push(F());
    if (gemSet.has(gk(cells[k][0], cells[k][1]))) prog.push(PK());
  }
  return prog;
}

function countBlocks(specs: Spec[]): number {
  let n = 0;
  const walk = (s: Spec) => {
    n++;
    if ('body' in s) s.body.forEach(walk);
    if ('then' in s) s.then.forEach(walk);
    if ('else' in s) s.else.forEach(walk);
  };
  specs.forEach(walk);
  return n;
}

/** 确保工具箱包含参考解用到的基础动作（转向/拾取/前进），避免无解 */
function ensureBaseBlocks(blocks: BlockType[], sol: Spec[]): BlockType[] {
  const need = new Set<BlockType>(blocks);
  const scan = (s: Spec) => {
    if (s.t === 'm_left' || s.t === 'm_right' || s.t === 'm_pick' || s.t === 'm_forward') need.add(s.t);
    if ('body' in s) s.body.forEach(scan);
    if ('then' in s) s.then.forEach(scan);
    if ('else' in s) s.else.forEach(scan);
  };
  sol.forEach(scan);
  return [...need];
}

type BugKind = 'chop' | 'flip_turn' | 'drop_pick';

/** 手工指定参考解的关卡（用于事件驱动 / 自定义函数等非自动生成解的玩法） */
function makeAuthored(
  id: number, size: [number, number], path: Pt[], gems: Pt[],
  blocks: BlockType[], solution: Spec[],
): LevelDef {
  const { rows, startDir } = buildMaze(size[0], size[1], path, gems);
  return {
    id, rows, startDir, par: countBlocks(solution), solution,
    blocks: ensureBaseBlocks(blocks, solution), mode: 'build',
  };
}

function makeLevel(
  id: number, size: [number, number], path: Pt[], gems: Pt[],
  blocks: BlockType[] = [], opts: { debug?: BugKind } = {},
): LevelDef {
  const { rows, startDir } = buildMaze(size[0], size[1], path, gems);
  const solution = genSolution(path, gems);
  const base: LevelDef = {
    id, rows, startDir, par: countBlocks(solution), solution,
    blocks: ensureBaseBlocks(blocks, solution), mode: opts.debug ? 'debug' : 'build',
  };
  if (opts.debug) base.brokenProgram = makeBroken(solution, opts.debug, gems);
  return base;
}

/** 从参考解派生"有且仅有一处错误"的调试程序 */
function makeBroken(sol: Spec[], kind: BugKind, gems: Pt[]): Spec[] {
  const copy = JSON.parse(JSON.stringify(sol)) as Spec[];
  if (kind === 'chop') return copy.slice(0, -1);           // 砍掉最后一步
  if (kind === 'drop_pick') {
    const i = copy.findIndex((s) => s.t === 'm_pick');
    if (i >= 0 && gems.length) { copy.splice(i, 1); return copy; }
    return copy.slice(0, -1);
  }
  // flip_turn：把第一个转向反过来
  for (const s of copy) {
    if (s.t === 'm_left') { (s as { t: BlockType }).t = 'm_right'; return copy; }
    if (s.t === 'm_right') { (s as { t: BlockType }).t = 'm_left'; return copy; }
  }
  return copy.slice(0, -1);
}

export interface Chapter { name: string; icon: string; from: number; to: number; }
/** 7 大主题：按功能分类，每章内部由简入难（关卡 id 连续，解锁仍按 1→45 线性推进） */
export const CHAPTERS: Chapter[] = [
  { name: '顺序与动作', icon: 'fwd',     from: 1,  to: 9 },
  { name: '循环',       icon: 'loop',    from: 10, to: 20 },
  { name: '条件与分支', icon: 'fork',    from: 21, to: 29 },
  { name: '传感器',     icon: 'wallEye', from: 30, to: 32 },
  { name: '事件',       icon: 'bolt',    from: 33, to: 36 },
  { name: '函数与抽象', icon: 'func',    from: 37, to: 41 },
  { name: '调试纠错',   icon: 'bug',     from: 42, to: 45 },
];
export function chapterOf(levelId: number): number {
  return CHAPTERS.findIndex((c) => levelId >= c.from && levelId <= c.to);
}

export const LEVELS: LevelDef[] = [
  // ===== 第 1 章：顺序与动作 =====
  makeLevel(1, [8, 3], [[1, 1], [6, 1]], []),
  makeLevel(2, [6, 3], [[1, 1], [4, 1]], [[3, 1]], []),
  makeLevel(3, [9, 3], [[1, 1], [7, 1]], [[2, 1], [4, 1], [6, 1]], []),
  makeLevel(4, [6, 5], [[1, 1], [4, 1], [4, 3]], [], ['m_left', 'm_right']),
  makeLevel(5, [7, 6], [[1, 1], [5, 1], [5, 4], [2, 4]], [], ['m_left', 'm_right']),
  makeLevel(6, [7, 6], [[1, 1], [5, 1], [5, 4]], [[5, 2]], ['m_left', 'm_right']),
  makeLevel(7, [7, 5], [[1, 3], [3, 3], [3, 1], [6, 1]], [[5, 1]], ['m_left', 'm_right']),
  makeLevel(8, [7, 3], [[3, 1], [5, 1], [1, 1]], [[5, 1]], ['m_turn_around', 'm_fwd_n']),
  makeLevel(9, [8, 3], [[1, 1], [6, 1]], [[3, 1]], ['m_fwd_n', 'm_turn_around']),

  // ===== 第 2 章：循环（重复/当型/直到 → 嵌套 → 规律分解）=====
  makeLevel(10, [11, 3], [[1, 1], [9, 1]], [], ['c_repeat_n']),
  makeLevel(11, [9, 3], [[1, 1], [7, 1]], [], ['c_while_fwd']),
  makeLevel(12, [12, 4], [[1, 1], [10, 1]], [], ['c_until_flag', 'c_while_fwd']),
  makeLevel(13, [8, 3], [[1, 1], [6, 1]], [], ['c_while_fwd', 'c_repeat_n']),
  makeLevel(14, [7, 5], [[1, 1], [5, 1], [5, 3], [1, 3]], [], ['m_left', 'm_right', 'c_repeat_n']),
  makeLevel(15, [7, 5], [[1, 1], [5, 1], [5, 3]], [[4, 1], [5, 2]], ['m_left', 'm_right', 'c_repeat_n']),
  makeLevel(16, [6, 5], [[1, 1], [5, 1], [5, 3], [1, 3], [1, 1]], [[3, 1], [5, 2], [3, 3]], ['m_left', 'm_right', 'c_repeat_n']),
  makeLevel(17, [6, 6], [[1, 1], [4, 1], [4, 4], [1, 4]], [[2, 4]], ['c_repeat_n']),
  makeLevel(18, [6, 5], [[1, 1], [4, 1], [4, 2], [1, 2], [1, 3], [4, 3]], [[2, 1], [2, 3]], ['c_repeat_n']),
  makeLevel(19, [7, 7], [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [5, 4], [5, 5]], [[2, 2], [4, 4]], ['z_step_r', 'z_step_l', 'c_repeat_n']),
  makeLevel(20, [9, 6], [[1, 1], [3, 1], [3, 2], [5, 2], [5, 3], [7, 3], [7, 4]], [[3, 2]], ['c_repeat_n', 'z_step_r', 'z_step_l']),

  // ===== 第 3 章：条件与分支（如果 → 多条件 → 二选一）=====
  makeLevel(21, [7, 3], [[1, 1], [5, 1]], [[2, 1], [4, 1]], ['i_if_gem', 'c_repeat_n']),
  makeLevel(22, [9, 3], [[1, 1], [7, 1]], [[3, 1], [5, 1]], ['i_if_gem', 'c_while_fwd']),
  makeLevel(23, [7, 6], [[1, 5], [5, 5], [5, 1]], [], ['m_left', 'm_right', 'i_if_wall', 'c_until_flag']),
  makeLevel(24, [7, 3], [[1, 1], [5, 1]], [[3, 1]], ['i_if_gem', 'i_if_wall', 'c_repeat_n']),
  makeLevel(25, [7, 7], [[1, 1], [5, 1], [5, 5], [1, 5], [1, 2]], [[5, 3], [3, 5]], ['m_left', 'm_right', 'i_if_gem', 'i_if_wall', 'c_until_flag']),
  makeLevel(26, [8, 3], [[1, 1], [6, 1]], [[2, 1], [4, 1]], ['i_if_else_gem', 'c_while_fwd']),
  makeLevel(27, [9, 3], [[1, 1], [7, 1]], [[2, 1], [3, 1], [5, 1]], ['i_if_else_gem', 'c_while_fwd']),
  makeLevel(28, [8, 6], [[1, 1], [6, 1], [6, 4], [1, 4]], [[3, 1], [6, 2], [4, 4]], ['m_left', 'm_right', 'i_if_gem', 'i_if_wall', 'c_while_fwd', 'c_until_flag']),
  makeLevel(29, [7, 7], [[1, 1], [5, 1], [5, 5], [1, 5], [1, 1], [1, 3]], [[3, 1], [5, 3], [3, 5]], ['m_left', 'm_right', 'i_if_gem', 'i_if_wall', 'c_repeat_n', 'c_while_fwd', 'c_until_flag']),

  // ===== 第 4 章：传感器（感知环境、自动决策）=====
  makeLevel(30, [9, 8], [[1, 1], [5, 1], [5, 3], [2, 3], [2, 5], [7, 5], [7, 6]], [], ['c_until_flag', 'i_if_wall', 'i_if_wall_left', 'i_if_wall_right']),
  makeLevel(31, [8, 8], [[1, 1], [1, 4], [4, 4], [4, 1], [6, 1], [6, 6], [2, 6]], [], ['c_until_flag', 'i_if_wall', 'i_if_wall_left', 'i_if_wall_right']),
  makeLevel(32, [9, 8], [[1, 1], [6, 1], [6, 4], [3, 4], [3, 6], [7, 6]], [[3, 1], [6, 3], [5, 6]], ['c_until_flag', 'i_if_wall', 'i_if_gem', 'i_if_wall_left', 'i_if_wall_right']),

  // ===== 第 5 章：事件驱动（先单规则，再叠加体会优先级）=====
  makeAuthored(33, [10, 3], [[1, 1], [8, 1]], [],
    ['e_when_nowall'],
    [EW('e_when_nowall', [F()])]),
  makeAuthored(34, [10, 3], [[1, 1], [8, 1]], [[3, 1], [5, 1]],
    ['e_when_gem', 'e_when_nowall'],
    [EW('e_when_gem', [PK()]), EW('e_when_nowall', [F()])]),
  makeAuthored(35, [9, 8], [[1, 1], [5, 1], [5, 3], [2, 3], [2, 6], [7, 6]], [],
    ['e_when_wall', 'e_when_nowall', 'i_if_else_wall_left'],
    [EW('e_when_wall', [ifEL([RT()], [LT()])]), EW('e_when_nowall', [F()])]),
  makeAuthored(36, [9, 8], [[1, 1], [6, 1], [6, 4], [3, 4], [3, 6], [7, 6]], [[3, 1], [6, 3], [5, 6]],
    ['e_when_gem', 'e_when_wall', 'e_when_nowall', 'i_if_else_wall_left'],
    [EW('e_when_gem', [PK()]), EW('e_when_wall', [ifEL([RT()], [LT()])]), EW('e_when_nowall', [F()])]),

  // ===== 第 6 章：函数与抽象（套路块预设 → 自定义函数）=====
  makeLevel(37, [6, 6], [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4]], [[3, 3]], ['z_step_r', 'z_step_l']),
  makeLevel(38, [7, 6], [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [5, 4]], [[2, 2], [4, 4]], ['z_step_r', 'z_step_l']),
  makeAuthored(39, [5, 5], [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3]], [],
    ['fn_def', 'fn_call'],
    [FNDEF([F(), RT(), F(), LT()]), FNCALL(2)]),
  makeAuthored(40, [7, 7], [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [5, 4], [5, 5]], [],
    ['fn_def', 'fn_call'],
    [FNDEF([F(), RT(), F(), LT()]), FNCALL(4)]),
  makeAuthored(41, [7, 7], [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [5, 4], [5, 5]], [[2, 2], [4, 4]],
    ['fn_def', 'fn_call', 'i_if_gem'],
    [FNDEF([F(), RT(), F(), ifG([PK()]), LT()]), FNCALL(4)]),

  // ===== 第 7 章：调试纠错（找错并修好）=====
  makeLevel(42, [7, 3], [[1, 1], [5, 1]], [[3, 1]], ['c_repeat_n'], { debug: 'chop' }),
  makeLevel(43, [7, 5], [[1, 1], [5, 1], [5, 3]], [[3, 1]], ['m_left', 'm_right', 'c_repeat_n'], { debug: 'flip_turn' }),
  makeLevel(44, [8, 3], [[1, 1], [6, 1]], [[2, 1], [4, 1]], ['i_if_gem', 'c_while_fwd'], { debug: 'drop_pick' }),
  makeLevel(45, [7, 6], [[1, 1], [5, 1], [5, 4]], [[5, 2]], ['m_left', 'm_right', 'c_repeat_n'], { debug: 'drop_pick' }),
];

/** 关卡自检：参考解必须通关；debug 预置程序必须不通过；宝石必须在通路上 */
export function checkLevels(): string[] {
  const errs: string[] = [];
  for (const lv of LEVELS) {
    const isEvent = lv.solution.some((s) => s.t.startsWith('e_when_'));
    const r = isEvent ? simulateEvents(lv.rows, lv.startDir, lv.solution) : simulate(lv.rows, lv.startDir, lv.solution);
    if (r !== 'win') errs.push(`L${lv.id}: 参考解未能通关（${r}）`);
    if (lv.mode === 'debug' && lv.brokenProgram) {
      if (simulate(lv.rows, lv.startDir, lv.brokenProgram) === 'win')
        errs.push(`L${lv.id}: debug 预置程序竟然通关了，应保留可修错误`);
    }
  }
  return errs;
}
