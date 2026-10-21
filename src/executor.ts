/**
 * executor.ts —— Blockly 工作区的"单步执行 + 积木高亮"解释器
 * 直接遍历积木树（不生成 JS），逐步驱动迷宫状态与动画，天然支持循环/条件。
 */
import * as Blockly from 'blockly';
import {
  MazeState, stepForward, stepBack, turnLeft, turnRight, pickup,
  aheadClear, aheadWall, wallLeft, wallRight, gemHere, atGoal, isWin,
} from './maze';
import { MazeRenderer, sleep } from './renderer';
import { Sfx } from './audio';
import { COMBOS, Spec, triggerActive } from './sim';

export type Outcome = 'win' | 'stuck' | 'loose' | 'empty';

export interface RunHooks {
  onBlockSound?: (type: string) => void;
}

const SPEED = { move: 260, turn: 170, highlightLead: 90 };

export class Executor {
  private guard = 0;
  private fnBody: Blockly.Block | null = null;

  constructor(
    private ws: Blockly.WorkspaceSvg,
    private state: MazeState,
    private rend: MazeRenderer,
    private sfx: Sfx,
    private hooks: RunHooks = {},
  ) {}

  async run(): Promise<Outcome> {
    const tops = this.ws.getTopBlocks(true);
    if (!tops.length) return 'empty';
    this.guard = 0;
    // 函数定义：登记第一个 fn_def 的体内积木（供 fn_call 展开）
    const def = tops.find((b) => b.type === 'fn_def');
    this.fnBody = def ? def.getInputTargetBlock('DO') : null;
    // 事件模式：存在事件帽子即走反应式循环
    const hats = tops.filter((b) => b.type.startsWith('e_when_'));
    if (hats.length) return this.runEventLoop(hats);
    // 线性/结构化：依次执行所有可执行顶层链（排除帽子与定义）
    const exec = tops.filter((b) => !b.type.startsWith('e_when_') && b.type !== 'fn_def');
    if (!exec.length) return 'empty';
    for (const t of exec) if (await this.execStack(t)) { this.ws.highlightBlock(null as unknown as string); return 'stuck'; }
    this.ws.highlightBlock(null as unknown as string);
    return isWin(this.state) ? 'win' : 'loose';
  }

  /** 事件驱动：每拍按顺序触发第一条命中的规则，执行其动作一次；防振荡 */
  private async runEventLoop(hats: Blockly.Block[]): Promise<Outcome> {
    const seen = new Map<string, number>();
    for (let tick = 0; tick < 400; tick++) {
      if (atGoal(this.state)) { this.ws.highlightBlock(null as unknown as string); return isWin(this.state) ? 'win' : 'loose'; }
      const rule = hats.find((h) => triggerActive(this.state, h.type));
      if (!rule) { this.sfx.blocked(); this.rend.shakeRobot(); await sleep(300); return 'stuck'; }
      this.hl(rule);
      if (await this.execStack(rule.getInputTargetBlock('DO'))) { this.ws.highlightBlock(null as unknown as string); return 'stuck'; }
      const sig = `${this.state.robot.x},${this.state.robot.y},${this.state.dir},${this.state.gems.size}`;
      const c = (seen.get(sig) || 0) + 1; seen.set(sig, c);
      if (c > hats.length + 2) return 'loose'; // 原地振荡，无进展
    }
    this.ws.highlightBlock(null as unknown as string);
    return isWin(this.state) ? 'win' : 'loose';
  }

  /** 执行一条积木链；返回 true 表示中途撞墙需中断 */
  private async execStack(block: Blockly.Block | null): Promise<boolean> {
    while (block) {
      if (await this.execBlock(block)) return true;
      block = block.getNextBlock();
    }
    return false;
  }

  private async execBlock(b: Blockly.Block): Promise<boolean> {
    if (++this.guard > 3000) return true; // 防死循环
    this.hooks.onBlockSound?.(b.type);
    switch (b.type) {
      case 'm_forward': return this.doMove(b, stepForward, SPEED.move);
      case 'm_back': return this.doMove(b, stepBack, SPEED.move);
      case 'm_left': this.hl(b); turnLeft(this.state); this.sfx.turn(); await this.rend.animateTurn(SPEED.turn); return false;
      case 'm_right': this.hl(b); turnRight(this.state); this.sfx.turn(); await this.rend.animateTurn(SPEED.turn); return false;
      case 'm_pick': return this.doPick(b);
      case 'c_repeat_n': return this.doRepeat(b);
      case 'c_while_fwd': return this.doWhile(b, () => aheadClear(this.state));
      case 'c_until_flag': return this.doWhile(b, () => !atGoal(this.state));
      case 'i_if_gem': if (gemHere(this.state)) return this.execStack(b.getInputTargetBlock('DO')); return false;
      case 'i_if_wall': if (aheadWall(this.state)) return this.execStack(b.getInputTargetBlock('DO')); return false;
      case 'i_if_wall_left': if (wallLeft(this.state)) return this.execStack(b.getInputTargetBlock('DO')); return false;
      case 'i_if_wall_right': if (wallRight(this.state)) return this.execStack(b.getInputTargetBlock('DO')); return false;
      case 'i_if_else_gem': return this.execStack(gemHere(this.state) ? b.getInputTargetBlock('DO') : b.getInputTargetBlock('ELSE'));
      case 'i_if_else_wall_left': return this.execStack(wallLeft(this.state) ? b.getInputTargetBlock('DO') : b.getInputTargetBlock('ELSE'));
      case 'fn_call': return this.doFnCall(b);
      case 'm_turn_around': this.hl(b); turnLeft(this.state); turnLeft(this.state); this.sfx.turn(); await this.rend.animateTurn(SPEED.turn); return false;
      case 'm_fwd_n': return this.doFwdN(b);
      case 'z_step_r': return this.doCombo(b, COMBOS.z_step_r);
      case 'z_step_l': return this.doCombo(b, COMBOS.z_step_l);
      default: return false;
    }
  }

  private hl(b: Blockly.Block) { this.ws.highlightBlock(b.id); }

  /** 调用自定义动作：把 fn_def 体内积木执行 N 次（N = 参数） */
  private async doFnCall(b: Blockly.Block): Promise<boolean> {
    if (!this.fnBody) { this.sfx.blocked(); return false; } // 未定义→空操作
    const n = parseInt(String(b.getFieldValue('TIMES')), 10) || 1;
    this.hl(b); await sleep(SPEED.highlightLead);
    for (let i = 0; i < n; i++) { if (++this.guard > 3000) return true; if (await this.execStack(this.fnBody)) return true; }
    return false;
  }
  /** 套路块：整块高亮，展开为一串固定原子动作逐步带动画执行 */
  private async doCombo(b: Blockly.Block, prims: Spec[]): Promise<boolean> {
    this.hl(b); await sleep(SPEED.highlightLead);
    for (const p of prims) {
      if (++this.guard > 3000) return true;
      switch (p.t) {
        case 'm_forward':
          if (!stepForward(this.state)) { this.sfx.blocked(); this.rend.shakeRobot(); await sleep(400); return true; }
          this.sfx.step(); await this.rend.animateMove(SPEED.move); break;
        case 'm_back':
          if (!stepBack(this.state)) { this.sfx.blocked(); this.rend.shakeRobot(); await sleep(400); return true; }
          this.sfx.step(); await this.rend.animateMove(SPEED.move); break;
        case 'm_left': turnLeft(this.state); this.sfx.turn(); await this.rend.animateTurn(SPEED.turn); break;
        case 'm_right': turnRight(this.state); this.sfx.turn(); await this.rend.animateTurn(SPEED.turn); break;
        case 'm_pick': { const { x, y } = this.state.robot; if (pickup(this.state)) { this.rend.removeGemAt(x, y); this.sfx.pick(); await sleep(160); } break; }
      }
    }
    return false;
  }

  private async doMove(b: Blockly.Block, fn: (s: MazeState) => boolean, ms: number): Promise<boolean> {
    this.hl(b);
    await sleep(SPEED.highlightLead);
    if (!fn(this.state)) { this.sfx.blocked(); this.rend.shakeRobot(); await sleep(400); return true; }
    this.sfx.step();
    await this.rend.animateMove(ms);
    return false;
  }

  /** 前进 N 步（一个积木干多件事；中途撞墙则中断） */
  private async doFwdN(b: Blockly.Block): Promise<boolean> {
    const n = parseInt(String(b.getFieldValue('TIMES')), 10) || 0;
    for (let i = 0; i < n; i++) {
      this.hl(b);
      await sleep(SPEED.highlightLead);
      if (!stepForward(this.state)) { this.sfx.blocked(); this.rend.shakeRobot(); await sleep(400); return true; }
      this.sfx.step(); await this.rend.animateMove(SPEED.move);
    }
    return false;
  }

  private async doPick(b: Blockly.Block): Promise<boolean> {
    this.hl(b); await sleep(SPEED.highlightLead);
    const { x, y } = this.state.robot;
    if (pickup(this.state)) { this.rend.removeGemAt(x, y); this.sfx.pick(); await sleep(160); }
    return false;
  }

  private async doRepeat(b: Blockly.Block): Promise<boolean> {
    this.hl(b);
    const n = parseInt(String(b.getFieldValue('TIMES')), 10) || 0;
    const body = b.getInputTargetBlock('DO');
    for (let i = 0; i < n; i++) if (await this.execStack(body)) return true;
    return false;
  }

  private async doWhile(b: Blockly.Block, cond: () => boolean): Promise<boolean> {
    this.hl(b);
    const body = b.getInputTargetBlock('DO');
    let iter = 0;
    while (cond()) {
      if (++iter > 60 || await this.execStack(body)) return true;
    }
    return false;
  }
}
