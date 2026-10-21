import { checkLevels, LEVELS } from '../src/levels';

const errs = checkLevels();
if (errs.length) {
  console.log('❌ 关卡校验失败：');
  for (const e of errs) console.log('  ' + e);
  process.exit(1);
} else {
  console.log(`✅ 全部 ${LEVELS.length} 关校验通过（参考解可通关，debug 关预置程序确有错误）`);
}
