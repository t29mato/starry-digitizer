// INFO: magnifier panel (right column) and the canvas area around it. Both
// live in this one catalogue because the canvas itself renders only a handful
// of words; `x:` / `y:` readouts, zoom percentages and pixel counts are pure
// symbols and are therefore not keyed at all.
export const magnifier = {
  en: {
    'magnifier.settings': 'Settings',
    'magnifier.scale': 'Magnifier (times)',
    'magnifier.effectiveDigits': 'Effective digits',
    'magnifier.markerSize': 'Marker size (px)',
    'magnifier.considerGraphTilt': 'Consider graph tilt',
    'magnifier.scaleError':
      'The Magnifier scale is supposed to be larger than 2 times.',
    'magnifier.effectiveDigitsError': 'Value must be between 1 and 10',
    'magnifier.markerSizeError': 'Value must be at least 1',
    // INFO: the canvas status line keeps its two values in bold <span>s, so
    // the labels are keyed separately instead of as one interpolated
    // sentence; the "/" between them is punctuation and stays in the template.
    'canvas.datasetLabel': 'Dataset:',
    'canvas.axisSetLabel': 'XY Axes:',
    'canvas.allDatasetsViewOnly': 'All Datasets (View Only)',
    // INFO: labels that follow the cursor while a mask tool is selected.
    'canvas.cursorPen': 'Pen',
    'canvas.cursorBox': 'Box',
    'canvas.cursorEraser': 'Eraser',
  },
  ja: {
    'magnifier.settings': '設定',
    'magnifier.scale': '拡大率(倍)',
    'magnifier.effectiveDigits': '有効数字',
    'magnifier.markerSize': 'マーカーサイズ (px)',
    'magnifier.considerGraphTilt': 'グラフの傾きを考慮する',
    'magnifier.scaleError': '拡大率は2倍以上に設定してください。',
    'magnifier.effectiveDigitsError': '1〜10の範囲で入力してください',
    'magnifier.markerSizeError': '1以上の値を入力してください',
    'canvas.datasetLabel': 'データセット:',
    'canvas.axisSetLabel': 'XY軸:',
    'canvas.allDatasetsViewOnly': '全データセット(表示のみ)',
    'canvas.cursorPen': 'ペン',
    'canvas.cursorBox': '矩形',
    'canvas.cursorEraser': '消しゴム',
  },
} as const
