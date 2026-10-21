/**
 * renderer.ts —— 迷宫 SVG 渲染 + 机器人动画
 * 与积木执行解耦：执行器改状态，渲染器负责把状态画出来并做过渡动画。
 */
import { MazeState, Dir } from './maze';

const ROT: Record<Dir, number> = { 0: 0, 1: 90, 2: 180, 3: 270 }; // E,S,W,N

export class MazeRenderer {
  private cell = 60;
  private svg!: SVGSVGElement;
  private robot!: SVGGElement;
  private gemLayer!: SVGGElement;
  private state!: MazeState;
  private start = { x: 1, y: 1 };

  constructor(private host: HTMLElement) {}

  layout(state: MazeState) {
    this.state = state;
    this.start = { x: state.robot.x, y: state.robot.y };
    const { w, h } = state;
    this.cell = Math.min(60, Math.floor(460 / Math.max(w, h)));
    const size = { vw: w * this.cell, vh: h * this.cell };
    this.host.innerHTML = '';
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size.vw} ${size.vh}`);
    svg.setAttribute('width', String(size.vw));
    svg.setAttribute('height', String(size.vh));
    this.svg = svg;

    // 地面 + 墙（立体砖块 + 地面纹理）
    const rect = (x: number, y: number, ww: number, hh: number, fill: string, rx = 9) => {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', String(x)); r.setAttribute('y', String(y));
      r.setAttribute('width', String(ww)); r.setAttribute('height', String(hh));
      r.setAttribute('rx', String(rx)); r.setAttribute('fill', fill);
      return r;
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const wall = state.walls[y * w + x];
      const px = x * this.cell, py = y * this.cell;
      if (wall) {
        svg.appendChild(rect(px, py, this.cell, this.cell, '#a97f6e', 10));
        svg.appendChild(rect(px + 3, py + 3, this.cell - 6, this.cell * 0.40, '#c69a86', 7));
      } else {
        svg.appendChild(rect(px, py, this.cell, this.cell, (x + y) % 2 ? '#efe4c8' : '#fbf3e0', 10));
        svg.appendChild(rect(px + 4, py + 4, this.cell - 8, this.cell - 8, 'rgba(255,255,255,0.30)', 8));
      }
    }
    // 起点发光垫（帮助孩子认清“从哪出发”）
    svg.appendChild(this.startMark(this.start));

    // 终点旗帜
    svg.appendChild(this.goalMark(state));
    // 宝石层（可被拾取后移除）
    this.gemLayer = document.createElementNS(NS, 'g');
    for (const k of state.gems) {
      const [gx, gy] = k.split(',').map(Number);
      this.gemLayer.appendChild(this.gemMark(gx, gy));
    }
    svg.appendChild(this.gemLayer);

    // 机器人（顶视、基线朝东 = +x，与 ROT[dir] 顺时针旋转对齐）
    this.robot = document.createElementNS(NS, 'g');
    this.robot.setAttribute('class', 'robot');
    const c = this.cell;
    this.robot.innerHTML =
      `<rect x="${-0.36 * c}" y="${-0.42 * c}" width="${0.72 * c}" height="${0.17 * c}" rx="${0.08 * c}" fill="#00695c"/>` +
      `<rect x="${-0.36 * c}" y="${0.25 * c}" width="${0.72 * c}" height="${0.17 * c}" rx="${0.08 * c}" fill="#00695c"/>` +
      `<rect x="${-0.36 * c}" y="${-0.34 * c}" width="${0.74 * c}" height="${0.68 * c}" rx="${0.22 * c}" fill="#26a69a" stroke="#00897b" stroke-width="3.5"/>` +
      `<rect x="${0.22 * c}" y="${-0.25 * c}" width="${0.19 * c}" height="${0.50 * c}" rx="${0.09 * c}" fill="#4db6ac"/>` +
      `<circle cx="${0.06 * c}" cy="${-0.15 * c}" r="${0.105 * c}" fill="#fff"/><circle cx="${0.06 * c}" cy="${0.15 * c}" r="${0.105 * c}" fill="#fff"/>` +
      `<circle cx="${0.09 * c}" cy="${-0.15 * c}" r="${0.052 * c}" fill="#263238"/><circle cx="${0.09 * c}" cy="${0.15 * c}" r="${0.052 * c}" fill="#263238"/>` +
      `<path d="M${0.44 * c} 0 L${0.30 * c} ${-0.14 * c} L${0.30 * c} ${0.14 * c} Z" fill="#ffe082" stroke="#ffb300" stroke-width="2"/>`;
    svg.appendChild(this.robot);
    this.placeRobot(0);

    this.host.appendChild(svg);
  }

  private cx(x: number) { return x * this.cell + this.cell / 2; }
  private cy(y: number) { return y * this.cell + this.cell / 2; }

  private startMark(s: { x: number; y: number }): SVGElement {
    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    const px = this.cx(s.x), py = this.cy(s.y);
    g.innerHTML =
      `<circle cx="${px}" cy="${py}" r="${this.cell * 0.34}" fill="rgba(38,166,154,0.16)" stroke="#26a69a" stroke-width="2.5" stroke-dasharray="5 5"/>`;
    return g;
  }

  private placeRobot(animMs: number) {
    const { x, y } = this.state.robot;
    this.robot.style.transition = animMs ? `transform ${animMs}ms ease` : 'none';
    this.robot.setAttribute('transform', `translate(${this.cx(x)} ${this.cy(y)}) rotate(${ROT[this.state.dir]})`);
  }

  private goalMark(s: MazeState): SVGElement {
    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    const px = this.cx(s.goal.x), py = this.cy(s.goal.y), k = this.cell;
    g.innerHTML =
      `<circle cx="${px}" cy="${py}" r="${k * 0.42}" fill="rgba(102,187,106,0.20)"/>` +
      `<rect x="${px - 0.30 * k}" y="${py - 0.34 * k}" width="${0.60 * k}" height="${0.68 * k}" rx="10" fill="#66bb6a"/>` +
      `<path d="M${px - 0.14 * k} ${py - 0.24 * k} v${0.48 * k}" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M${px - 0.14 * k} ${py - 0.24 * k} h${0.30 * k} l-${0.11 * k} ${0.11 * k} ${0.11 * k} ${0.11 * k} h-${0.30 * k} Z" fill="#ffeb3b"/>`;
    return g;
  }

  private gemMark(x: number, y: number): SVGElement {
    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('data-x', String(x)); g.setAttribute('data-y', String(y));
    const px = this.cx(x), py = this.cy(y), s = this.cell * 0.30;
    g.innerHTML =
      `<path d="M${px} ${py - s} L${px + s} ${py - s * 0.15} L${px} ${py + s} L${px - s} ${py - s * 0.15} Z" fill="#ffc107" stroke="#ff8f00" stroke-width="2"/>` +
      `<path d="M${px} ${py - s} L${px + s} ${py - s * 0.15} L${px} ${py - s * 0.02} Z" fill="#ffd54f"/>` +
      `<path d="M${px} ${py - s} L${px - s} ${py - s * 0.15} L${px} ${py - s * 0.02} Z" fill="#fff59d"/>`;
    return g;
  }

  /** 依据当前状态播放一步移动/转向动画（执行器改完 state 后调用） */
  async animateMove(ms: number) { this.placeRobot(ms); await sleep(ms); }
  animateTurn(ms: number) { this.placeRobot(ms); return sleep(ms); }
  /** 拾取：移除对应宝石图形 */
  removeGemAt(x: number, y: number) {
    const target = this.gemLayer.querySelector(`g[data-x="${x}"][data-y="${y}"]`);
    if (target) this.gemLayer.removeChild(target);
  }
  shakeRobot() {
    this.robot.classList.add('shake');
    setTimeout(() => this.robot.classList.remove('shake'), 600);
  }
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
