// INFO: extraction panel (manual modes, interpolation, automatic extraction,
// selection-area mask, colour matching) plus the image-upload panel.
export const extract = {
  en: {
    'extract.manualExtraction': 'Manual Extraction',
    'extract.disabledInViewAllMode': 'Disabled in View All mode',
    // INFO: the single-letter keyboard shortcut is kept in every locale — it
    // is the physical key, not a word.
    'extract.manualAdd': 'Add (A)',
    'extract.manualEdit': 'Edit (E)',
    'extract.manualDelete': 'Delete (D)',
    'extract.interpolation': 'Interpolation',
    'extract.interval': 'Interval:',
    'extract.interpolationNeedsTwoPoints':
      'Point 2 or more points by clicking the graph image to execute interpolation.',
    'extract.automaticExtraction': 'Automatic Extraction',
    'extract.algorithm': 'Algorithm:',
    // INFO: labels only — 'Symbol Extract' / 'Line Extract' stay the option
    // *values* because the extractor compares them as identifiers.
    'extract.strategySymbolExtract': 'Symbol Extract',
    'extract.strategyLineExtract': 'Line Extract',
    'extract.symbolMin': 'Min:',
    'extract.symbolMax': 'Max:',
    // INFO: ΔX / ΔY are symbols and stay as they are in every locale.
    'extract.lineDx': 'ΔX:',
    'extract.lineDy': 'ΔY:',
    'extract.selectionArea': 'Selection Area',
    'extract.maskPen': 'Pen',
    'extract.maskBox': 'Box',
    'extract.maskEraser': 'Eraser',
    'extract.penSize': 'Pen Size:',
    'extract.eraserSize': 'Eraser Size:',
    'extract.color': 'Color',
    'extract.colorDiff': 'Color Diff.',
    'extract.colorDiffTooSmall':
      'The Color Difference(%) is supposed to be larger than 1%.',
    'extract.colorDiffTooLarge':
      'The Color Difference(%) is supposed to be smaller than 100%',
    'image.chooseAnImage': 'Choose an image',
    'image.replaceConfirm':
      'Loading a new image will reset all axis coordinates and datasets. Are you sure you want to continue?',
  },
  ja: {
    'extract.manualExtraction': '手動抽出',
    'extract.disabledInViewAllMode': '全データセット表示中は使用できません',
    'extract.manualAdd': '追加 (A)',
    'extract.manualEdit': '編集 (E)',
    'extract.manualDelete': '削除 (D)',
    'extract.interpolation': '補間',
    'extract.interval': '間隔:',
    'extract.interpolationNeedsTwoPoints':
      'グラフ画像をクリックして2点以上を指定すると補間できます。',
    'extract.automaticExtraction': '自動抽出',
    'extract.algorithm': 'アルゴリズム:',
    'extract.strategySymbolExtract': 'シンボル抽出',
    'extract.strategyLineExtract': '線抽出',
    'extract.symbolMin': '最小:',
    'extract.symbolMax': '最大:',
    'extract.lineDx': 'ΔX:',
    'extract.lineDy': 'ΔY:',
    'extract.selectionArea': '選択範囲',
    'extract.maskPen': 'ペン',
    'extract.maskBox': '矩形',
    'extract.maskEraser': '消しゴム',
    'extract.penSize': 'ペンの太さ:',
    'extract.eraserSize': '消しゴムの太さ:',
    'extract.color': '色',
    'extract.colorDiff': '色の許容差',
    'extract.colorDiffTooSmall':
      '色の許容差(%)は1%より大きい値にしてください。',
    'extract.colorDiffTooLarge':
      '色の許容差(%)は100%より小さい値にしてください',
    'image.chooseAnImage': '画像を選択',
    'image.replaceConfirm':
      '新しい画像を読み込むと、XY軸の座標とデータセットがすべてリセットされます。続行しますか?',
  },
} as const
