# gen-tts.ps1 —— 用 Windows SAPI 离线合成短语音到 public/audio/*.wav
# 用法: npm run tts   （需要系统装有中文语音；缺失则跳过并提示）
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$outDir = Join-Path $PSScriptRoot '..\public\audio'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$zh = $synth.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture -like 'zh*' } | Select-Object -First 1
if (-not $zh) {
  Write-Host "未找到已启用的中文语音，跳过语音生成（游戏会用音效兜底，不影响游玩）。" -ForegroundColor Yellow
  Write-Host "可在 设置→时间和语言→语音 中添加中文语音后重试。" -ForegroundColor Yellow
  exit 0
}
$synth.SelectVoice($zh.VoiceInfo.Name)
Write-Host ("使用语音: " + $zh.VoiceInfo.Name) -ForegroundColor Cyan

# key -> 文本
$lines = @{
  great = '太棒了！'
  again = '再试一次，你可以的！'
  win   = '恭喜通关！'
  fwd   = '前进'
  turn  = '转弯'
  loop  = '重复'
  pick  = '拾宝石'
  if    = '如果'
}
foreach ($k in $lines.Keys) {
  $file = Join-Path $outDir ($k + '.wav')
  $synth.SetOutputToWaveFile($file)
  $synth.Speak($lines[$k])
  $synth.SetOutputToNull()
  Write-Host ("生成 " + $k + ".wav") -ForegroundColor Green
}

# 每关教学讲解语音：从 level-tips.json 读取 -> level-<id>.wav
$tipsPath = Join-Path $PSScriptRoot '..\src\level-tips.json'
if (Test-Path $tipsPath) {
  $tips = Get-Content -Raw -Encoding UTF8 $tipsPath | ConvertFrom-Json
  foreach ($prop in $tips.PSObject.Properties) {
    $file = Join-Path $outDir ('level-' + $prop.Name + '.wav')
    $synth.SetOutputToWaveFile($file)
    $synth.Speak([string]$prop.Value.kid)
    $synth.SetOutputToNull()
    Write-Host ("生成 level-" + $prop.Name + ".wav") -ForegroundColor Green
  }
} else {
  Write-Host "未找到 level-tips.json，跳过关卡语音。" -ForegroundColor Yellow
}

$synth.Dispose()
Write-Host "语音生成完成 -> public/audio" -ForegroundColor Cyan
