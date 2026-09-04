// INFO: strings of the XY axes panels (AxisSetManager + AxisSetSettings).
// `x1:`/`x2:`/`y1:`/`y2:` are symbols, so they are identical in both locales;
// they still live here so the templates read every label from one catalogue.
export const axis = {
  en: {
    'axis.listTitle': 'XY Axes List',
    'axis.addAxisSet': 'Add axis set',
    'axis.removeAxisSet': 'Remove axis set',
    'axis.axisSetNamePlaceholder': 'axisSet {id}',
    'axis.removeAxisSetConfirm':
      "Are you sure to remove '{name}'? After the removal, '{alternative}' will be applied to the following datasets: {datasets}",
    'axis.x1Prefix': 'x1:',
    'axis.x2Prefix': 'x2:',
    'axis.y1Prefix': 'y1:',
    'axis.y2Prefix': 'y2:',
    'axis.logScale': 'Log',
    'axis.xValuesNotZero': 'x1 or x2 should not be 0',
    'axis.xValuesNotSame': 'x1 and x2 should not be same value',
    'axis.yValuesNotZero': 'y1 or y2 should not be 0',
    'axis.yValuesNotSame': 'y1 and y2 should not be same value',
    'axis.calibrationMode': 'Calibration mode:',
    'axis.twoPoints': '2 Points',
    'axis.fourPoints': '4 Points',
    'axis.showAxesMarker': 'Show axes marker',
    'axis.editAxes': 'Edit Axes',
    'axis.clearAxes': 'Clear XY Axes',
    'axis.autoFill': 'Auto-fill values (OCR)',
    'axis.autoFillRunning': 'Auto-fill values (OCR)…',
    'axis.autoFillHint':
      'OCR the numbers near each axis marker and fill in its value',
    'axis.ocrWarning':
      'Auto-filled values may be inaccurate — decimal points are sometimes misread (e.g. "0.4" detected as "4"). Please double-check each value before proceeding.',
    'axis.ocrNoImage': 'No image is loaded.',
    'axis.ocrNoLabels':
      'No axis labels were recognized near the axis markers. Please enter the values manually.',
    'axis.ocrFailed':
      'Auto-detection failed. Please enter the values manually.',
  },
  ja: {
    'axis.listTitle': 'XY軸リスト',
    'axis.addAxisSet': 'XY軸セットを追加',
    'axis.removeAxisSet': 'XY軸セットを削除',
    'axis.axisSetNamePlaceholder': 'XY軸セット {id}',
    'axis.removeAxisSetConfirm':
      '「{name}」を削除しますか？削除後、次のデータセットには「{alternative}」が適用されます: {datasets}',
    'axis.x1Prefix': 'x1:',
    'axis.x2Prefix': 'x2:',
    'axis.y1Prefix': 'y1:',
    'axis.y2Prefix': 'y2:',
    'axis.logScale': 'Log',
    'axis.xValuesNotZero': 'x1 または x2 に 0 は指定できません',
    'axis.xValuesNotSame': 'x1 と x2 に同じ値は指定できません',
    'axis.yValuesNotZero': 'y1 または y2 に 0 は指定できません',
    'axis.yValuesNotSame': 'y1 と y2 に同じ値は指定できません',
    'axis.calibrationMode': '較正モード:',
    'axis.twoPoints': '2点',
    'axis.fourPoints': '4点',
    'axis.showAxesMarker': 'XY軸マーカーを表示',
    'axis.editAxes': 'XY軸を編集',
    'axis.clearAxes': 'XY軸をクリア',
    'axis.autoFill': '値を自動入力 (OCR)',
    'axis.autoFillRunning': '値を自動入力中 (OCR)…',
    'axis.autoFillHint':
      '各XY軸マーカー付近の数値をOCRで読み取り、値を自動入力します',
    'axis.ocrWarning':
      '自動入力された値は不正確な場合があります。小数点が読み落とされることがあります（例:「0.4」が「4」と認識される）。次に進む前に各値をご確認ください。',
    'axis.ocrNoImage': '画像が読み込まれていません。',
    'axis.ocrNoLabels':
      'XY軸マーカー付近から軸ラベルを認識できませんでした。値を手動で入力してください。',
    'axis.ocrFailed': '自動検出に失敗しました。値を手動で入力してください。',
  },
} as const
