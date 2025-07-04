# デバッグモードでの軸情報自動抽出

軸情報の自動抽出でデバッグモードを有効にすると、OCRで検出されたx1, x2, y1, y2の値が枠で囲まれて表示されます。

## 使用方法

```javascript
import { AxisExtractor } from './src/application/services/axisExtractor/axisExtractor'

// デバッグモードを有効にしてAxisExtractorを作成
const axisExtractor = new AxisExtractor({ debug: true })

// または既存のインスタンスでデバッグモードを切り替え
axisExtractor.setDebug(true)

// 軸情報を抽出
const result = await axisExtractor.extractAxisInformation(imageData)
```

## デバッグ表示

デバッグモードが有効な場合：

1. **視覚的な表示**: 画面右上に画像とOCR領域が表示されます
2. **色分けされた枠**:
   - **赤色 (x1)**: X軸の最小値
   - **緑色 (x2)**: X軸の最大値  
   - **青色 (y1)**: Y軸の最小値
   - **紫色 (y2)**: Y軸の最大値
   - **灰色 (other)**: その他のOCR領域

3. **コンソールログ**: 各OCR領域の詳細情報が出力されます

## デバッグキャンバスのクリア

```javascript
// BrowserAdapterのインスタンスを取得してクリア
const adapter = axisExtractor.unifiedExtractor.getAdapter()
if (adapter.clearDebugCanvas) {
  adapter.clearDebugCanvas()
}
```

## 注意事項

- デバッグモードはブラウザ環境でのみ動作します
- パフォーマンスへの影響があるため、本番環境では無効にしてください