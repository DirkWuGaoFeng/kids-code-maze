/**
 * blocks.ts —— 纯图标积木定义（零文字）
 * 分色体系：动作=绿 / 拾取=粉 / 循环=橙 / 条件=蓝
 */
import * as Blockly from 'blockly';
import { iconUri } from './icons';

export const HUE_MOVE = 140;
export const HUE_PICK = 330;
export const HUE_LOOP = 30;
export const HUE_IF = 210;
export const HUE_COMBO = 275;
export const HUE_EVENT = 180; // 事件/触发（青）
export const HUE_FUNC = 260;  // 自定义函数（紫）

const img = (name: string, size = 30) =>
  new Blockly.FieldImage(iconUri(name, '#ffffff'), size, size, '*');

export const BLOCK_META: Record<string, { label: string; sound: string }> = {
  m_forward: { label: '前进', sound: 'step' },
  m_back: { label: '后退', sound: 'step' },
  m_left: { label: '左转', sound: 'turn' },
  m_right: { label: '右转', sound: 'turn' },
  m_pick: { label: '拾取', sound: 'pick' },
  c_repeat_n: { label: '重复N次', sound: 'loop' },
  c_while_fwd: { label: '路通就一直做', sound: 'loop' },
  c_until_flag: { label: '重复直到终点', sound: 'loop' },
  i_if_gem: { label: '脚下有宝石就', sound: 'if' },
  i_if_wall: { label: '前面有墙就', sound: 'if' },
  i_if_wall_left: { label: '左边有墙就', sound: 'if' },
  i_if_wall_right: { label: '右边有墙就', sound: 'if' },
  i_if_else_gem: { label: '有宝石就…否则…', sound: 'if' },
  i_if_else_wall_left: { label: '左边有墙就…否则…', sound: 'if' },
  e_when_gem: { label: '当碰到宝石', sound: 'if' },
  e_when_wall: { label: '当碰前面有墙', sound: 'if' },
  e_when_nowall: { label: '当路还通', sound: 'if' },
  e_when_wall_left: { label: '当左边有墙', sound: 'if' },
  e_when_wall_right: { label: '当右边有墙', sound: 'if' },
  fn_def: { label: '我的动作', sound: 'combo' },
  fn_call: { label: '用我的动作×N', sound: 'combo' },
  m_turn_around: { label: '向后转', sound: 'turn' },
  m_fwd_n: { label: '前进N步', sound: 'step' },
  z_step_r: { label: '套路：前进右转', sound: 'combo' },
  z_step_l: { label: '套路：前进左转', sound: 'combo' },
};

export function defineBlocks() {
  // —— 动作积木 ——
  Blockly.Blocks['m_forward'] = {
    init() {
      this.appendDummyInput().appendField(img('fwd'));
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_MOVE);
    },
  };
  Blockly.Blocks['m_back'] = {
    init() {
      this.appendDummyInput().appendField(img('back'));
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_MOVE);
    },
  };
  Blockly.Blocks['m_left'] = {
    init() {
      this.appendDummyInput().appendField(img('turnL'));
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_MOVE);
    },
  };
  Blockly.Blocks['m_right'] = {
    init() {
      this.appendDummyInput().appendField(img('turnR'));
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_MOVE);
    },
  };
  Blockly.Blocks['m_pick'] = {
    init() {
      this.appendDummyInput().appendField(img('pick'));
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_PICK);
    },
  };
  Blockly.Blocks['m_turn_around'] = {
    init() {
      this.appendDummyInput().appendField(img('turnAround'));
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_MOVE);
    },
  };
  Blockly.Blocks['m_fwd_n'] = {
    init() {
      this.appendDummyInput()
        .appendField(img('fwd'))
        .appendField(img('times', 20))
        .appendField(new Blockly.FieldDropdown(
          [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'],
           ['7', '7'], ['8', '8'], ['9', '9'], ['10', '10']]), 'TIMES');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_MOVE);
    },
  };

  // —— 循环积木 ——
  Blockly.Blocks['c_repeat_n'] = {
    init() {
      this.appendDummyInput()
        .appendField(img('loop'))
        .appendField(img('times', 20))
        .appendField(new Blockly.FieldDropdown(
          [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'],
           ['7', '7'], ['8', '8'], ['9', '9'], ['10', '10']]), 'TIMES');
      this.appendStatementInput('DO');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_LOOP);
    },
  };
  Blockly.Blocks['c_while_fwd'] = {
    init() {
      this.appendDummyInput()
        .appendField(img('loop'))
        .appendField(img('eyeOK', 26));
      this.appendStatementInput('DO');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_LOOP);
    },
  };
  Blockly.Blocks['c_until_flag'] = {
    init() {
      this.appendDummyInput()
        .appendField(img('loop'))
        .appendField(img('flag', 26));
      this.appendStatementInput('DO');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_LOOP);
    },
  };

  // —— 条件积木 ——
  Blockly.Blocks['i_if_gem'] = {
    init() {
      this.appendDummyInput()
        .appendField(img('gemEye'))
        .setCheck(null);
      this.appendStatementInput('DO');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_IF);
    },
  };
  Blockly.Blocks['i_if_wall'] = {
    init() {
      this.appendDummyInput().appendField(img('wallEye'));
      this.appendStatementInput('DO');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_IF);
    },
  };
  Blockly.Blocks['i_if_wall_left'] = {
    init() {
      this.appendDummyInput().appendField(img('wallEye')).appendField(img('turnL', 22));
      this.appendStatementInput('DO');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_IF);
    },
  };
  Blockly.Blocks['i_if_wall_right'] = {
    init() {
      this.appendDummyInput().appendField(img('wallEye')).appendField(img('turnR', 22));
      this.appendStatementInput('DO');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_IF);
    },
  };
  Blockly.Blocks['i_if_else_gem'] = {
    init() {
      this.appendDummyInput().appendField(img('gemEye'));
      this.appendStatementInput('DO');
      this.appendDummyInput().appendField(img('fork', 26));
      this.appendStatementInput('ELSE');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_IF);
    },
  };
  Blockly.Blocks['i_if_else_wall_left'] = {
    init() {
      this.appendDummyInput().appendField(img('wallEye')).appendField(img('turnL', 22));
      this.appendStatementInput('DO');
      this.appendDummyInput().appendField(img('fork', 26));
      this.appendStatementInput('ELSE');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_IF);
    },
  };

  // —— 套路块（宏：一块 = 打包好的"前进+转向"，可反复拖用）——
  Blockly.Blocks['z_step_r'] = {
    init() {
      this.appendDummyInput().appendField(img('combo', 26)).appendField(img('fwd', 22)).appendField(img('turnR', 22));
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_COMBO);
    },
  };
  Blockly.Blocks['z_step_l'] = {
    init() {
      this.appendDummyInput().appendField(img('combo', 26)).appendField(img('fwd', 22)).appendField(img('turnL', 22));
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_COMBO);
    },
  };

  // —— 事件积木（帽子：无上下连接，作为顶层规则；执行器每拍按顺序触发第一条命中的）——
  const eventHat = (icons: Array<[string, number]>, type: string) => {
    Blockly.Blocks[type] = {
      init() {
        const inp = this.appendDummyInput().appendField(img('bolt', 26));
        for (const [n, s] of icons) inp.appendField(img(n, s)); // 每次 init 新建 Field，避免跨实例复用
        this.appendStatementInput('DO');
        this.setColour(HUE_EVENT);
      },
    };
  };
  eventHat([['gemEye', 26]], 'e_when_gem');
  eventHat([['wallEye', 26]], 'e_when_wall');
  eventHat([['eyeOK', 26]], 'e_when_nowall');
  eventHat([['wallEye', 26], ['turnL', 22]], 'e_when_wall_left');
  eventHat([['wallEye', 26], ['turnR', 22]], 'e_when_wall_right');

  // —— 自定义函数：把一串动作存成一个新积木，反复调用（带×N 参数）——
  Blockly.Blocks['fn_def'] = {
    init() {
      this.appendDummyInput().appendField(img('func', 26)).appendField(img('combo', 24));
      this.appendStatementInput('DO');
      this.setColour(HUE_FUNC);
    },
  };
  Blockly.Blocks['fn_call'] = {
    init() {
      this.appendDummyInput()
        .appendField(img('func', 26))
        .appendField(img('times', 20))
        .appendField(new Blockly.FieldDropdown(
          [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'],
           ['7', '7'], ['8', '8'], ['9', '9']]), 'TIMES');
      this.setPreviousStatement(true); this.setNextStatement(true);
      this.setColour(HUE_FUNC);
    },
  };
}

/** 按关卡可用积木清单生成扁平 toolbox（无分类 → 无文字） */
export function toolboxFor(blockTypes: string[]) {
  return {
    kind: 'flyoutToolbox',
    contents: blockTypes.map((t) => ({ kind: 'block', type: t })),
  };
}
