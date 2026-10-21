/**
 * sim.ts —— 无头执行器（不依赖 Blockly/DOM）
 * 既用于开发期关卡自动校验，也保证关卡一定可解。
 * 三种程序范式共用一套执行核 makeRunner：
 *   - 线性/结构化：runSpec（顺序、循环、条件、函数定义/调用）
 *   - 事件驱动：simulateEvents（每拍触发第一条命中的规则）
 */
import {
  MazeState, parseRows, stepForward, stepBack, turnLeft, turnRight,
  pickup, aheadClear, aheadWall, wallLeft, wallRight, gemHere, atGoal, isWin, Dir,
} from './maze';

export type Spec =
  | { t: 'm_forward' } | { t: 'm_back' } | { t: 'm_left' } | { t: 'm_right' } | { t: 'm_pick' }
  | { t: 'c_repeat_n'; n: number; body: Spec[] }
  | { t: 'c_while_fwd'; body: Spec[] }
  | { t: 'c_until_flag'; body: Spec[] }
  | { t: 'i_if_gem'; body: Spec[] }
  | { t: 'i_if_wall'; body: Spec[] }
  | { t: 'i_if_wall_left'; body: Spec[] }
  | { t: 'i_if_wall_right'; body: Spec[] }
  | { t: 'i_if_else_gem'; then: Spec[]; else: Spec[] }
  | { t: 'i_if_else_wall_left'; then: Spec[]; else: Spec[] }
  | { t: 'm_turn_around' }
  | { t: 'm_fwd_n'; n: number }
  | { t: 'z_step_r' } | { t: 'z_step_l' }
  // —— 事件帽子（顶层规则，线性模式忽略）——
  | { t: 'e_when_gem'; body: Spec[] }
  | { t: 'e_when_wall'; body: Spec[] }
  | { t: 'e_when_nowall'; body: Spec[] }
  | { t: 'e_when_wall_left'; body: Spec[] }
  | { t: 'e_when_wall_right'; body: Spec[] }
  // —— 自定义函数：定义（顶层，登记不执行）/ 调用（把定义体执行 n 次）——
  | { t: 'fn_def'; body: Spec[] }
  | { t: 'fn_call'; n: number };

/** 套路块（宏）：一块封装一段固定动作，隐性传达"打包/复用"。 */
export const COMBOS: Record<string, Spec[]> = {
  z_step_r: [{ t: 'm_forward' }, { t: 'm_right' }],
  z_step_l: [{ t: 'm_forward' }, { t: 'm_left' }],
};

export type RunResult = 'win' | 'stuck' | 'loose';

const isEvent = (t: string) => t.startsWith('e_when_');

/** 事件触发条件求值 */
export function triggerActive(state: MazeState, type: string): boolean {
  switch (type) {
    case 'e_when_gem': return gemHere(state);
    case 'e_when_wall': return aheadWall(state);
    case 'e_when_nowall': return aheadClear(state);
    case 'e_when_wall_left': return wallLeft(state);
    case 'e_when_wall_right': return wallRight(state);
    default: return false;
  }
}

/** 执行核：绑定一个 MazeState，逐步执行 Spec；供线性与事件两种模式复用。 */
function makeRunner(state: MazeState) {
  const abort = { stuck: false };
  let guard = 0;
  let fnBody: Spec[] = [];

  function execOne(s: Spec): boolean {
    if (++guard > 600) { abort.stuck = true; return false; }
    switch (s.t) {
      case 'm_forward': if (!stepForward(state)) { abort.stuck = true; return false; } return true;
      case 'm_back': if (!stepBack(state)) { abort.stuck = true; return false; } return true;
      case 'm_left': turnLeft(state); return true;
      case 'm_right': turnRight(state); return true;
      case 'm_pick': pickup(state); return true;
      case 'c_repeat_n': {
        for (let i = 0; i < s.n; i++) if (!execBody(s.body)) return false;
        return true;
      }
      case 'c_while_fwd': {
        let g = 0;
        while (aheadClear(state)) { if (++g > 60) { abort.stuck = true; return false; } if (!execBody(s.body)) return false; }
        return true;
      }
      case 'c_until_flag': {
        let g = 0;
        while (!atGoal(state)) { if (++g > 60) { abort.stuck = true; return false; } if (!execBody(s.body)) return false; }
        return true;
      }
      case 'i_if_gem': if (gemHere(state)) return execBody(s.body); return true;
      case 'i_if_wall': if (aheadWall(state)) return execBody(s.body); return true;
      case 'i_if_wall_left': if (wallLeft(state)) return execBody(s.body); return true;
      case 'i_if_wall_right': if (wallRight(state)) return execBody(s.body); return true;
      case 'i_if_else_gem': return gemHere(state) ? execBody(s.then) : execBody(s.else);
      case 'i_if_else_wall_left': return wallLeft(state) ? execBody(s.then) : execBody(s.else);
      case 'm_turn_around': turnLeft(state); turnLeft(state); return true;
      case 'm_fwd_n': { for (let i = 0; i < s.n; i++) if (!stepForward(state)) { abort.stuck = true; return false; } return true; }
      case 'z_step_r': return execBody(COMBOS.z_step_r);
      case 'z_step_l': return execBody(COMBOS.z_step_l);
      case 'fn_def': fnBody = s.body; return true; // 登记，不在此处执行
      case 'fn_call': { for (let i = 0; i < s.n; i++) if (!execBody(fnBody)) return false; return true; }
      default: return true; // 事件帽子等在别处处理
    }
  }
  function execBody(body: Spec[]): boolean {
    for (const b of body) if (!execOne(b)) return false;
    return true;
  }
  return { execOne, execBody, abort };
}

/** 线性/结构化执行：顶层事件帽子跳过，函数定义先登记。 */
export function runSpec(state: MazeState, specs: Spec[]): RunResult {
  const r = makeRunner(state);
  for (const top of specs) {
    if (top.t === 'fn_def') { r.execOne(top); continue; } // 登记定义体
    if (isEvent(top.t)) continue;
    if (!r.execOne(top)) return 'stuck';
  }
  return isWin(state) ? 'win' : 'loose';
}

/** 事件驱动执行：每拍按顺序触发第一条命中的规则，执行其动作一次。 */
export function runEvents(state: MazeState, rules: Spec[], maxTicks = 500): RunResult {
  const r = makeRunner(state);
  for (let t = 0; t < maxTicks; t++) {
    if (atGoal(state)) return isWin(state) ? 'win' : 'loose';
    const fired = rules.find((s) => isEvent(s.t) && triggerActive(state, s.t));
    if (!fired) return 'stuck';
    const body = 'body' in fired ? (fired.body as Spec[]) : [];
    if (!r.execBody(body)) return 'stuck';
  }
  return isWin(state) ? 'win' : 'loose';
}

export function simulate(rows: string[], startDir: Dir, specs: Spec[]): RunResult {
  return runSpec(parseRows(rows, startDir), specs);
}
export function simulateEvents(rows: string[], startDir: Dir, rules: Spec[]): RunResult {
  return runEvents(parseRows(rows, startDir), rules);
}
