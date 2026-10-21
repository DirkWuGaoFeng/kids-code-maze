/**
 * audio.ts —— 音效层
 * 音效全部用 WebAudio 实时合成（零素材、离线可用）；
 * 语音短提示走预生成的 wav（tools/gen-tts.ps1 产出），缺失则静默降级。
 */
export class Sfx {
  private ctx?: AudioContext;
  enabled = true;

  private ac(): AudioContext | undefined {
    if (!this.enabled) return undefined;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    return this.ctx;
  }

  /** 解锁音频上下文（须由用户手势触发） */
  resume() { this.ac()?.resume?.(); }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.15, when = 0) {
    const ctx = this.ac(); if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  step() { this.tone(440, 0.12, 'triangle', 0.12); }
  turn() { this.tone(330, 0.12, 'sine', 0.12); }
  pick() { this.tone(660, 0.1, 'square', 0.1); this.tone(880, 0.12, 'square', 0.1, 0.06); }
  blocked() { this.tone(140, 0.25, 'sawtooth', 0.14); }
  click() { this.tone(520, 0.06, 'sine', 0.1); }
  unlock() { this.tone(523, 0.12, 'triangle', 0.12); this.tone(784, 0.16, 'triangle', 0.12, 0.08); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.14, i * 0.12)); }

  private lastSpeak: Record<string, number> = {};
  /** 播放预生成语音（缺失则 no-op）；同一 key 900ms 内去抖，避免循环体内每轮重复触发变噪音 */
  speak(key: string, throttleMs = 900) {
    if (!this.enabled) return;
    const now = Date.now();
    if (this.lastSpeak[key] && now - this.lastSpeak[key] < throttleMs) return;
    this.lastSpeak[key] = now;
    const a = new Audio(`audio/${key}.wav`);
    a.volume = 0.9;
    a.play().catch(() => { /* 未生成语音文件时静默 */ });
  }
}
