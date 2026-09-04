// INFO: dataset list panel (left sidebar) and the extracted-values data table.
export const dataset = {
  en: {
    'dataset.heading': 'Datasets',
    'dataset.addDataset': 'Add dataset',
    'dataset.removeAllDatasets': 'Remove all datasets',
    'dataset.viewAllDatasets': 'View all datasets',
    'dataset.copyDatasetToClipboard': 'Copy dataset to clipboard',
    'dataset.clearPoints': 'Clear points',
    'dataset.deleteDataset': 'Delete dataset',
    // INFO: keep byte-identical to the old `'dataset ' + dataset.id`.
    'dataset.namePlaceholder': 'dataset {id}',
    'dataset.discardTempPointsConfirm':
      'There are unconfirmed interpolated points. Do you want to discard them and switch to a different dataset?',
    'dataset.deleteConfirm':
      "Are you sure to delete '{name}'? This operation is irreversible.",
    'dataset.deleteAllConfirm':
      'Are you sure to delete all {count} datasets? This will remove {points} data points. This operation is irreversible.',
    // INFO: X / Y stay symbols in every locale — they label plot axes.
    'dataset.columnX': 'X',
    'dataset.columnY': 'Y',
  },
  ja: {
    'dataset.heading': 'データセット',
    'dataset.addDataset': 'データセットを追加',
    'dataset.removeAllDatasets': 'すべてのデータセットを削除',
    'dataset.viewAllDatasets': 'すべてのデータセットを表示',
    'dataset.copyDatasetToClipboard': 'データセットをクリップボードにコピー',
    'dataset.clearPoints': '点をクリア',
    'dataset.deleteDataset': 'データセットを削除',
    'dataset.namePlaceholder': 'データセット {id}',
    'dataset.discardTempPointsConfirm':
      '未確定の補間点があります。破棄して別のデータセットに切り替えますか?',
    'dataset.deleteConfirm':
      '「{name}」を削除しますか?この操作は取り消せません。',
    'dataset.deleteAllConfirm':
      'すべてのデータセット{count}件を削除しますか?データ点{points}個が失われます。この操作は取り消せません。',
    'dataset.columnX': 'X',
    'dataset.columnY': 'Y',
  },
} as const
