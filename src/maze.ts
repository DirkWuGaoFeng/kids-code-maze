/**
 * maze.ts —— 迷宫网格状态机（自写迷宫壳的核心，纯逻辑无 DOM）
 */

export type Dir = 0 | 1 | 2 | 3; // E, S, W, N
export const DX = [1, 0, -1, 0];
export const DY = [0, 1, 0, -1];

export interface Cell { x: number; y: number }

export interface MazeState {
  w: number; h: number;
  walls: boolean[];            // y*w+x
  robot: Cell;
  dir: Dir;
  gems: Set<string>;           // "x,y"
  gemTotal: number;
  goal: Cell;
  collected: number;
}

const key = (x: number, y: number) => `${x},${y}`;

/**
 * 解析关卡地图字符串。图例：
 * '#'=墙  '.'=通路  'S'=起点  'F'=终点  'g'=带宝石的通路
 */
export function parseRows(rows: string[], startDir: Dir): MazeState {
  const h = rows.length, w = rows[0].length;
  const walls: boolean[] = new Array(w * h).fill(true);
  let robot: Cell = { x: 1, y: 1 };
  let goal: Cell = { x: 1, y: 1 };
  const gems = new Set<string>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === '#') continue;
      walls[y * w + x] = false;
      if (c === 'S') robot = { x, y };
      else if (c === 'F') goal = { x, y };
      else if (c === 'g') gems.add(key(x, y));
    }
  }
  return { w, h, walls, robot: { ...robot }, dir: startDir, gems, gemTotal: gems.size, goal, collected: 0 };
}

export function isWallAt(s: MazeState, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return true;
  return s.walls[y * s.w + x];
}

/** 机器人朝当前方向前进一步；撞墙返回 false */
export function stepForward(s: MazeState): boolean {
  const nx = s.robot.x + DX[s.dir], ny = s.robot.y + DY[s.dir];
  if (isWallAt(s, nx, ny)) return false;
  s.robot = { x: nx, y: ny };
  return true;
}

export function stepBack(s: MazeState): boolean {
  const nx = s.robot.x - DX[s.dir], ny = s.robot.y - DY[s.dir];
  if (isWallAt(s, nx, ny)) return false;
  s.robot = { x: nx, y: ny };
  return true;
}

export function turnLeft(s: MazeState) { s.dir = ((s.dir + 3) % 4) as Dir; }
export function turnRight(s: MazeState) { s.dir = ((s.dir + 1) % 4) as Dir; }

/** 拾取脚下宝石；没有宝石返回 false（不视为失败，只是没捡到） */
export function pickup(s: MazeState): boolean {
  const k = key(s.robot.x, s.robot.y);
  if (s.gems.has(k)) {
    s.gems.delete(k);
    s.collected++;
    return true;
  }
  return false;
}

// —— 传感器 ——
export function aheadClear(s: MazeState): boolean {
  return !isWallAt(s, s.robot.x + DX[s.dir], s.robot.y + DY[s.dir]);
}
export function aheadWall(s: MazeState): boolean {
  return !aheadClear(s);
}
/** 侧向感知：机器人左/右手边是否墙（用于“感知环境自动决策”类玩法） */
export function wallLeft(s: MazeState): boolean {
  const d = ((s.dir + 3) % 4) as Dir;
  return isWallAt(s, s.robot.x + DX[d], s.robot.y + DY[d]);
}
export function wallRight(s: MazeState): boolean {
  const d = ((s.dir + 1) % 4) as Dir;
  return isWallAt(s, s.robot.x + DX[d], s.robot.y + DY[d]);
}
export function gemHere(s: MazeState): boolean {
  return s.gems.has(key(s.robot.x, s.robot.y));
}
export function atGoal(s: MazeState): boolean {
  return s.robot.x === s.goal.x && s.robot.y === s.goal.y;
}

/** 通关判定：到达终点且宝石收完 */
export function isWin(s: MazeState): boolean {
  return atGoal(s) && s.gems.size === 0;
}
