// INFO: strings of the standalone app chrome: the native-app-style menu bar,
// the keyboard-shortcuts reference, the PWA update prompt and the footer
// area. Nothing here is part of the embeddable <StarryDigitizer> component.
export const app = {
  en: {
    // Menu bar titles
    'app.file': 'File',
    'app.edit': 'Edit',
    'app.view': 'View',
    'app.help': 'Help',
    'app.language': 'Language',

    // File menu
    'app.saveProject': 'Save Project',
    'app.loadProject': 'Load Project',
    'app.copyDataToClipboard': 'Copy Data to Clipboard',

    // Edit menu
    'app.undo': 'Undo',
    'app.redo': 'Redo',

    // View menu
    'app.zoomIn': 'Zoom In',
    'app.zoomOut': 'Zoom Out',
    'app.resetZoom': 'Reset to 100%',
    'app.fit': 'Fit',
    'app.showAxesMarker': 'Show Axes Marker',
    'app.interpolation': 'Interpolation',

    // Help menu
    'app.document': 'Document',
    'app.releaseNote': 'Release Note',
    'app.keyboardShortcuts': 'Keyboard Shortcuts',

    // Keyboard shortcuts dialog
    'app.shortcuts.activateAllPoints': 'Activate all points',
    'app.shortcuts.deactivatePoints': 'Deactivate points',
    'app.shortcuts.deleteActivePoints': 'Delete active points',
    'app.shortcuts.movePoint1px': 'Move active point/axis (1px)',
    'app.shortcuts.movePoint10px': 'Move active point/axis (10px)',
    'app.shortcuts.manualExtractionMode': 'Manual Extraction mode',

    // PWA update prompt
    'app.pwa.updateAvailable': 'A new version is available',
    'app.pwa.updateAvailableVersion': 'A new version (v{version}) is available',
    'app.pwa.whatsNew': "What's new:",
    'app.pwa.later': 'Later',
    'app.pwa.reload': 'Reload',

    // Misc app chrome
    'app.unsupportedDevice':
      'This application is not supported on smartphones.',
    'app.unsupportedDeviceHint': 'Please access here on a PC.',
    'app.genericError': 'An error occurred',
  },
  ja: {
    // Menu bar titles
    'app.file': 'ファイル',
    'app.edit': '編集',
    'app.view': '表示',
    'app.help': 'ヘルプ',
    'app.language': '言語',

    // File menu
    'app.saveProject': 'プロジェクトを保存',
    'app.loadProject': 'プロジェクトを開く',
    'app.copyDataToClipboard': 'データをクリップボードにコピー',

    // Edit menu
    'app.undo': '元に戻す',
    'app.redo': 'やり直す',

    // View menu
    'app.zoomIn': '拡大',
    'app.zoomOut': '縮小',
    'app.resetZoom': '100%に戻す',
    'app.fit': '画面に合わせる',
    'app.showAxesMarker': 'XY軸マーカーを表示',
    'app.interpolation': '補間',

    // Help menu
    'app.document': 'ドキュメント',
    'app.releaseNote': 'リリースノート',
    'app.keyboardShortcuts': 'キーボードショートカット',

    // Keyboard shortcuts dialog
    'app.shortcuts.activateAllPoints': 'すべての点を選択',
    'app.shortcuts.deactivatePoints': '点の選択を解除',
    'app.shortcuts.deleteActivePoints': '選択中の点を削除',
    'app.shortcuts.movePoint1px': '選択中の点/軸を移動 (1px)',
    'app.shortcuts.movePoint10px': '選択中の点/軸を移動 (10px)',
    'app.shortcuts.manualExtractionMode': '手動抽出モード',

    // PWA update prompt
    'app.pwa.updateAvailable': '新しいバージョンが利用できます',
    'app.pwa.updateAvailableVersion':
      '新しいバージョン (v{version}) が利用できます',
    'app.pwa.whatsNew': '更新内容:',
    'app.pwa.later': 'あとで',
    'app.pwa.reload': '再読み込み',

    // Misc app chrome
    'app.unsupportedDevice': 'このアプリはスマートフォンに対応していません。',
    'app.unsupportedDeviceHint': 'PCからアクセスしてください。',
    'app.genericError': 'エラーが発生しました',
  },
} as const
