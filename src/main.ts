/**
 * main.ts —— 应用装配与界面路由
 * 流程：档案页 → 地图页 → 游戏页（Blockly + 迷宫）→ 庆祝层。
 */
import * as Blockly from 'blockly';
import { defineBlocks, toolboxFor } from './blocks';
import { iconUri, icon } from './icons';
import { LEVELS, LevelDef, CHAPTERS } from './levels';
import { Spec } from './sim';
import { parseRows, MazeState } from './maze';
import { MazeRenderer } from './renderer';
import { Executor, Outcome } from './executor';
import { Sfx } from './audio';
import * as store from './storage';
import TIPS_JSON from './level-tips.json';
const TIPS = TIPS_JSON as Record<string, { concept: string; kid: string }>;

const sfx = new Sfx();
let workspace: Blockly.WorkspaceSvg | null = null;
let renderer: MazeRenderer | null = null;
let curLevel: LevelDef | null = null;
let running = false;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
function showScreen(name: 'profiles' | 'map' | 'game') {
  for (const s of ['profiles', 'map', 'game']) $('screen-' + s).classList.toggle('hidden', s !== name);
}

// ============================ 档案页 ============================
function renderProfiles() {
  $('logo-slot').innerHTML =
    `<img src="${iconUri('robot', '#26a69a')}" width="96" height="96" alt=""/>`;
  const list = $('profile-list'); list.innerHTML = '';
  for (const p of store.listProfiles()) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.innerHTML = `<div class="avatar">${p.avatar}</div><div class="pstars">${miniStars(p)}</div>`;
    card.onclick = () => { sfx.resume(); sfx.click(); store.selectProfile(p.id); renderMap(); showScreen('map'); };
    list.appendChild(card);
  }
  if (store.listProfiles().length < 8) {
    const add = document.createElement('div');
    add.className = 'profile-card add';
    add.innerHTML = `<div class="avatar">＋</div>`;
    add.onclick = () => { sfx.resume(); sfx.click(); store.addProfile(); renderProfiles(); };
    list.appendChild(add);
  }
}
function miniStars(p: store.Profile) {
  const sum = Object.values(p.stars).reduce((a, b) => a + b, 0);
  const shown = Math.min(3, Math.ceil(sum / Math.max(1, LEVELS.length) * 3) || (sum ? 1 : 0));
  let s = '';
  for (let i = 0; i < 3; i++) s += `<img src="${iconUri('star', i < shown ? '#ffb300' : '#e0e0e0')}" width="22" height="22"/>`;
  return s;
}

// ============================ 地图页 ============================
function renderMap() {
  const cur = store.currentProfile(); if (!cur) return;
  $('map-avatar').textContent = cur.avatar;
  const board = $('map-board'); board.innerHTML = '';
  const byId = new Map<number, LevelDef>(LEVELS.map((lv) => [lv.id, lv]));
  const NODE = 92, GX = 40, GY = 46; // 节点直径 / 列间距 / 行间距（行距留空给星级）
  const svgns = 'http://www.w3.org/2000/svg';
  // 每章一张卡片；章内关卡沿蛇形小径排列，颜色由绿→红体现“由简入难”
  for (const ch of CHAPTERS) {
    const lvs: LevelDef[] = [];
    for (let id = ch.from; id <= ch.to; id++) { const lv = byId.get(id); if (lv) lvs.push(lv); }
    const count = lvs.length;
    // 均衡每行数量，避免“8+1”孤行：先定上限列数，再按行数回推列数
    let cols = Math.min(5, count);
    cols = Math.ceil(count / Math.ceil(count / cols));
    const rows = Math.ceil(count / cols);

    const sec = document.createElement('div'); sec.className = 'chapter';
    const head = document.createElement('div'); head.className = 'chapter-head';
    head.innerHTML =
      `<img class="c-icon" src="${iconUri(ch.icon, '#6d4c41')}" width="40" height="40" alt=""/>` +
      `<span class="c-name">${ch.name}</span>` +
      `<span class="c-range">${ch.from}–${ch.to}</span>` +
      `<span class="c-diff"><span>由简</span><img src="${iconUri('fwd', '#bcaaa4')}" width="18" height="18" class="rot"/><span>入难</span></span>`;

    const path = document.createElement('div'); path.className = 'chapter-path';
    path.style.gridTemplateColumns = `repeat(${cols}, ${NODE}px)`;
    path.style.columnGap = GX + 'px';
    path.style.rowGap = GY + 'px';

    const pts: string[] = [];
    lvs.forEach((lv, i) => {
      const r = Math.floor(i / cols);
      const pc = i % cols;
      const vc = (r % 2 === 0) ? pc : (cols - 1 - pc); // 奇数行反向 → 蛇形连续
      pts.push(`${vc * (NODE + GX) + NODE / 2},${r * (NODE + GY) + NODE / 2}`);

      const unlocked = store.isUnlocked(lv.id);
      const stars = store.getStars(lv.id);
      const node = document.createElement('div');
      node.className = 'node' + (unlocked ? (stars ? '' : ' next') : ' locked');
      node.style.gridColumn = String(vc + 1);
      node.style.gridRow = String(r + 1);
      if (unlocked) { // 难度渐变：绿(易)→红(难)，仅解锁节点上色，锁定保持灰
        const t = count > 1 ? i / (count - 1) : 0;
        node.style.background = `hsl(${Math.round(120 - 120 * t)}, 70%, 92%)`;
      }
      node.innerHTML = `<span class="no">${lv.id}</span>` + starRow(stars);
      if (lv.mode === 'debug') node.innerHTML += `<span class="badge"><img src="${iconUri('bug', '#e53935')}" width="30" height="30"/></span>`;
      if (unlocked) node.onclick = () => { sfx.click(); openLevel(lv); };
      else node.onclick = () => sfx.blocked();
      path.appendChild(node);
    });

    // 蛇形虚线小径（置于节点下层，按算术坐标绘制，无需测量 DOM）
    const W = cols * NODE + (cols - 1) * GX;
    const H = rows * NODE + (rows - 1) * GY;
    const svg = document.createElementNS(svgns, 'svg');
    svg.setAttribute('class', 'chapter-trail');
    svg.setAttribute('width', String(W)); svg.setAttribute('height', String(H));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const poly = document.createElementNS(svgns, 'polyline');
    poly.setAttribute('points', pts.join(' '));
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', '#d7ccc8');
    poly.setAttribute('stroke-width', '7');
    poly.setAttribute('stroke-linecap', 'round');
    poly.setAttribute('stroke-linejoin', 'round');
    poly.setAttribute('stroke-dasharray', '2 16');
    svg.appendChild(poly);
    path.insertBefore(svg, path.firstChild);

    sec.appendChild(head); sec.appendChild(path); board.appendChild(sec);
  }
}
function starRow(stars: number) {
  let s = `<div class="stars">`;
  for (let i = 0; i < 3; i++) s += `<img src="${iconUri('star', i < stars ? '#ffb300' : '#cfcfcf')}" width="18" height="18"/>`;
  return s + `</div>`;
}

// ============================ 游戏页 ============================
/** 抽象概念积木 → 短语音 key（对不识字孩子用语音强化积木含义；移动类靠音效不抢话） */
const CONCEPT_VOICE: Record<string, string> = {
  c_repeat_n: 'loop', c_while_fwd: 'loop', c_until_flag: 'loop',
  i_if_gem: 'if', i_if_wall: 'if', i_if_else_gem: 'if', i_if_wall_left: 'if', i_if_wall_right: 'if', i_if_else_wall_left: 'if',
};

function openLevel(lv: LevelDef) {
  curLevel = lv;
  $('win-overlay').classList.add('hidden'); // 兜底：切关时清除上一次庆祝弹层残留
  showScreen('game');
  $('game-levelno').innerHTML = `<img src="${iconUri('flag', '#6d4c41')}" width="26" height="26"/> ${lv.id}`;
  $('game-goal').innerHTML =
    `<img src="${iconUri('gemGold')}" width="30" height="30"/><img src="${iconUri('flag', '#66bb6a')}" width="30" height="30"/>`;

  // 本关教学点：家长可点“ℹ”展开文字；对孩子则自动童声播报
  const tip = TIPS[String(lv.id)];
  const pn = $('parent-note');
  pn.innerHTML = tip ? `<b>本关教学点 · ${tip.concept}</b>　${tip.kid}` : '';
  pn.classList.add('hidden');
  sfx.speak('level-' + lv.id, 0);

  const state = parseRows(lv.rows, lv.startDir);
  renderer = new MazeRenderer($('mazeWrap'));
  renderer.layout(state);

  // 重建 Blockly 工作区（换关即重建工具箱）
  if (workspace) { workspace.dispose(); workspace = null; }
  const box = $('blocklyDiv'); box.innerHTML = '';
  workspace = Blockly.inject(box, {
    toolbox: toolboxFor(lv.blocks as string[]),
    media: 'blockly-media/', // 本地化 Blockly 资源（音效/精灵），避免离线时拉 CDN
    trashcan: true,
    zoom: { startScale: 1.15, maxScale: 1.5, minScale: 0.6 },
    move: { scrollbars: true, drag: true, wheel: true },
    grid: { spacing: 24, length: 3, colour: '#eee', snap: true },
  });
  if (lv.mode === 'debug' && lv.brokenProgram) placeSpec(workspace, lv.brokenProgram);
  workspace.render();
  if (import.meta.env.DEV) {
    (window as any).__ws = workspace; // 仅开发期暴露供自动化测试；生产构建被 tree-shake
    (window as any).__placeSolution = () => { if (workspace && curLevel) { placeSpec(workspace, curLevel.solution); workspace.render(); } };
  }
}

function resetLevel() {
  if (!curLevel || !workspace) return;
  workspace.clear();
  if (curLevel.mode === 'debug' && curLevel.brokenProgram) placeSpec(workspace, curLevel.brokenProgram);
  const state = parseRows(curLevel.rows, curLevel.startDir);
  renderer?.layout(state);
}

async function doRun() {
  if (!workspace || !renderer || !curLevel || running) return;
  running = true; $('btn-run').classList.add('running');
  // 每次运行重置迷宫到初始态并重绘
  const state = parseRows(curLevel.rows, curLevel.startDir);
  renderer.layout(state);
  const ex = new Executor(workspace, state, renderer, sfx, {
    onBlockSound: (t) => { const k = CONCEPT_VOICE[t]; if (k) sfx.speak(k); },
  });
  const outcome: Outcome = await ex.run();
  running = false; $('btn-run').classList.remove('running');
  workspace.highlightBlock(null as unknown as string);
  handleOutcome(outcome, state);
}

function handleOutcome(outcome: Outcome, state: MazeState) {
  if (outcome === 'empty') { sfx.blocked(); return; }
  if (outcome !== 'win') { sfx.speak('again'); return; } // 未过：软失败，无惩罚，可重试
  const used = workspace!.getAllBlocks(true).length;
  const par = curLevel!.par;
  const stars = used <= par ? 3 : used <= par + 2 ? 2 : 1;
  store.setStars(curLevel!.id, stars);
  sfx.win(); sfx.speak('great');
  showWin(stars);
}

// ============================ 庆祝层 ============================
function showWin(stars: number) {
  const ws = $('win-stars'); ws.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const fill = i < stars ? '#ffb300' : '#e0e0e0';
    ws.innerHTML += `<span class="s${i + 1}"><img src="${iconUri('star', fill)}" width="88" height="88"/></span>`;
  }
  const hasNext = curLevel && LEVELS.some((l) => l.id === curLevel!.id + 1);
  $('btn-win-next').style.display = hasNext ? 'flex' : 'none';
  $('win-overlay').classList.remove('hidden');
}

// ============================ Spec → Blockly ============================
function placeSpec(ws: Blockly.WorkspaceSvg, specs: Spec[]) {
  const standalone = (t: string) => t.startsWith('e_when_') || t === 'fn_def';
  let last: Blockly.Block | null = null;
  let topY = 40;
  for (const s of specs) {
    const b = createBlock(ws, s);
    if (standalone(s.t)) { b.moveBy(40, topY); topY += 170; last = null; continue; }
    if (last && last.nextConnection && b.previousConnection) last.nextConnection.connect(b.previousConnection);
    else { b.moveBy(40, topY); topY += 170; }
    last = b;
  }
}
function createBlock(ws: Blockly.WorkspaceSvg, s: Spec): Blockly.Block {
  const b = ws.newBlock(s.t);
  b.initSvg(); b.render();
  if ('n' in s) b.setFieldValue(String(s.n), 'TIMES');
  const fill = (name: string, body: Spec[]) => {
    const input = b.getInput(name);
    if (!input || !input.connection) return;
    let prev: Blockly.Block | null = null;
    for (const child of body) {
      const cb = createBlock(ws, child);
      if (!prev) input.connection.connect(cb.previousConnection!);
      else if (prev.nextConnection && cb.previousConnection) prev.nextConnection.connect(cb.previousConnection);
      prev = cb;
    }
  };
  if ('body' in s) fill('DO', s.body);
  if ('then' in s) fill('DO', s.then);
  if ('else' in s) fill('ELSE', s.else);
  return b;
}

// ============================ 图标按钮 ============================
function paintIcons() {
  $('btn-home').innerHTML = img('home', '#6d4c41');
  $('btn-back-map').innerHTML = img('home', '#6d4c41');
  $('btn-reset').innerHTML = img('loop', '#6d4c41');
  $('btn-run').innerHTML = img('play', '#ffffff', 46);
  $('btn-win-replay').innerHTML = img('loop', '#6d4c41');
  $('btn-win-next').innerHTML = img('check', '#ffffff');
  $('btn-win-home').innerHTML = img('home', '#6d4c41');
  $('btn-info').innerHTML = img('info', '#8d6e63', 26);
}
const img = (n: string, c: string, s = 34) => `<img src="${iconUri(n, c)}" width="${s}" height="${s}" draggable="false" alt=""/>`;

// ============================ 启动 ============================
function wireEvents() {
  $('btn-home').onclick = () => { sfx.click(); showScreen('profiles'); renderProfiles(); };
  $('btn-back-map').onclick = () => { sfx.click(); renderMap(); showScreen('map'); };
  $('btn-run').onclick = () => { sfx.resume(); doRun(); };
  $('btn-reset').onclick = () => { sfx.click(); resetLevel(); };
  $('btn-info').onclick = () => { sfx.click(); $('parent-note').classList.toggle('hidden'); };
  $('btn-win-replay').onclick = () => { sfx.click(); $('win-overlay').classList.add('hidden'); resetLevel(); };
  $('btn-win-home').onclick = () => { sfx.click(); $('win-overlay').classList.add('hidden'); renderMap(); showScreen('map'); };
  $('btn-win-next').onclick = () => {
    sfx.click(); $('win-overlay').classList.add('hidden');
    const next = curLevel && LEVELS.find((l) => l.id === curLevel!.id + 1);
    if (next && store.isUnlocked(next.id)) { sfx.unlock(); openLevel(next); }
    else renderMap(), showScreen('map');
  };
}

function boot() {
  defineBlocks();
  paintIcons();
  wireEvents();
  renderProfiles();
  if (store.currentProfile()) { renderMap(); showScreen('map'); }
  else showScreen('profiles');
  // 关卡自检（开发期在控制台报警）
  import('./levels').then((m) => { const e = m.checkLevels(); if (e.length) console.error('关卡校验:', e); });
}
document.addEventListener('DOMContentLoaded', boot);
