# StarryDigitizer - Starrydata2 統合実行計画

## 概要
StarryDigitizerをStarrydata2アプリケーションに埋め込み、双方向のデータ連携を実現する。StarryDigitizerはnpmパッケージとして提供され、Vue3コンポーネントとして利用される。

## 現状分析
### パッケージ構成
- **エントリーポイント**: `library-build/entry.ts`
- **メインコンポーネント**: `src/presentation/components/StarryDigitizer.vue`
- **Props**: `initialGraphImagePath`, `initialExtractorStrategy`, `exportBtnText`, `exportBtnClick`
- **スロット**: なし（現状）
- **イベント**: カスタムイベントなし（現状）

### データモデル
- **Axis**: 座標と値のみ、ラベル・単位なし
- **AxisSet**: 4軸（x1, x2, y1, y2）の集合
- **Dataset**: 点の集合、メタデータなし

## 主要要件
1. 軸プロパティ（物理量名など）と単位情報の追加
2. 外部アプリケーションからのデータ入力対応
3. 画像データの保存・転送機能
4. Starrydata2への統合

## 実装フェーズ

### フェーズ1: データモデルの拡張

#### 1.1 Axisインターフェースの拡張
**ファイル**: `src/domain/models/axis/axisInterface.ts`
```typescript
export interface AxisInterface {
  // 既存プロパティ
  name: string
  coord: Coord
  value: number
  initialCoord: Coord
  
  // 新規追加
  label?: string      // 軸ラベル（例：Temperature, Time）
  unit?: string       // 単位（例：K, °C, MPa）
  property?: string   // 物理量プロパティ（例：Seebeck coefficient）
}
```

#### 1.2 AxisSetインターフェースの拡張
**ファイル**: `src/domain/models/axisSet/axisSetInterface.ts`
- 軸のラベル・単位を設定/取得するメソッドを追加
- エクスポート時にメタデータを含める

#### 1.3 リポジトリの更新
**ファイル**: `src/infrastructures/repositories/axisSetRepository.ts`
- 新しいプロパティの永続化対応

### フェーズ2: 通信インターフェースの実装

#### 2.1 イベントエミッターの追加
**ファイル**: `src/presentation/components/StarryDigitizer.vue`
```vue
<script setup lang="ts">
// 新規Props追加
interface Props {
  // 既存
  initialGraphImagePath: string
  initialExtractorStrategy?: string
  exportBtnText?: string
  exportBtnClick?: () => void
  
  // 新規追加
  onDataChange?: (data: ExportData) => void
  onImageChange?: (imageData: string) => void
  initialAxisLabels?: AxisLabels
  initialAxisUnits?: AxisUnits
}

// イベント定義
const emit = defineEmits<{
  'data-change': [data: ExportData]
  'image-change': [imageData: string]
  'axis-info-change': [axisInfo: AxisInfo]
}>()
</script>
```

#### 2.2 スロットの追加
**ファイル**: `src/presentation/components/Settings/AxisSetSettings.vue`
```vue
<template>
  <!-- 既存の軸値設定の下に追加 -->
  <slot name="axis-properties">
    <!-- デフォルトの軸プロパティUI -->
  </slot>
</template>
```

### フェーズ3: UI拡張

#### 3.1 軸プロパティ設定コンポーネント
**新規ファイル**: `src/presentation/components/Settings/AxisPropertySettings.vue`
```vue
<template>
  <v-card>
    <v-card-title>軸プロパティ</v-card-title>
    <v-card-text>
      <v-text-field v-model="xAxisLabel" label="X軸ラベル" />
      <v-text-field v-model="xAxisUnit" label="X軸単位" />
      <v-text-field v-model="yAxisLabel" label="Y軸ラベル" />
      <v-text-field v-model="yAxisUnit" label="Y軸単位" />
    </v-card-text>
  </v-card>
</template>
```

#### 3.2 AxisSetSettingsへの統合
**ファイル**: `src/presentation/components/Settings/AxisSetSettings.vue`
- AxisPropertySettingsコンポーネントを組み込み
- 値変更時のイベント発火

### フェーズ4: 画像データ転送機能

#### 4.1 画像データのエクスポート
**ファイル**: `src/presentation/components/Canvas/CanvasMain.vue`
```typescript
// 画像データを取得してBase64エンコード
const getImageData = (): string => {
  const canvas = canvasRef.value
  return canvas.toDataURL('image/png')
}

// 親コンポーネントへの通知
watch(graphImage, (newImage) => {
  if (props.onImageChange) {
    emit('image-change', getImageData())
  }
})
```

#### 4.2 データセットマネージャーの拡張
**ファイル**: `src/presentation/components/DatasetManager/DatasetManager.vue`
- エクスポート時に軸プロパティを含める
- カスタムエクスポートハンドラーとの連携

### フェーズ5: Starrydata2側の統合

#### 5.1 StarryDigitizerラッパーコンポーネント
**Starrydata2側の新規ファイル**: `StarryDigitizerWrapper.vue`
```vue
<template>
  <StarryDigitizer
    :initialGraphImagePath="imagePath"
    :initialAxisLabels="axisLabels"
    :initialAxisUnits="axisUnits"
    @data-change="handleDataChange"
    @image-change="handleImageChange"
    @axis-info-change="handleAxisInfoChange"
  >
    <!-- カスタム軸プロパティUI（必要に応じて） -->
    <template #axis-properties>
      <CustomAxisProperties />
    </template>
  </StarryDigitizer>
</template>

<script setup>
import { StarryDigitizer } from 'starry-digitizer'
import 'starry-digitizer/dist/style.css'

const handleDataChange = (data) => {
  // Starrydata2のデータストアに保存
}

const handleImageChange = (imageData) => {
  // 画像データの保存処理
}

const handleAxisInfoChange = (axisInfo) => {
  // 軸情報の保存処理
}
</script>
```

#### 5.2 データ永続化
- Starrydata2のデータモデルにStarryDigitizerのデータを統合
- 画像データのストレージ保存
- 軸プロパティ・単位の保存

### フェーズ6: エクスポート機能の拡張

#### 6.1 CSVエクスポートの改善
**ファイル**: `src/application/services/dataExporter/csvDataExporter.ts`
```typescript
// CSVヘッダーに軸情報を追加
const headers = [
  `# X-Axis: ${axisSet.x1.label || 'X'} [${axisSet.x1.unit || ''}]`,
  `# Y-Axis: ${axisSet.y1.label || 'Y'} [${axisSet.y1.unit || ''}]`,
  `# Dataset: ${dataset.name}`,
  '',
  'X,Y'
].join('\n')
```

### フェーズ7: 型定義とインターフェース

#### 7.1 共通型定義
**新規ファイル**: `src/domain/types/axisMetadata.ts`
```typescript
export interface AxisMetadata {
  label: string
  unit: string
  property?: string
}

export interface ChartMetadata {
  xAxis: AxisMetadata
  yAxis: AxisMetadata
  title?: string
  source?: string
}

export interface ExportData {
  datasets: DatasetData[]
  metadata: ChartMetadata
  imageData?: string
}
```

## 代替案: StarryDigitizerのコード統合

### 概要
StarryDigitizerのソースコードを直接Starrydata2に組み込む方式。npmパッケージとしての依存を避け、完全な制御を得る。

### メリット
1. **完全な制御** - インターフェースの制約なし
2. **簡単なカスタマイズ** - 直接コードを修正可能
3. **通信オーバーヘッドなし** - 同一アプリケーション内で動作
4. **デバッグの容易さ** - 一つのコードベースで完結
5. **バージョン管理の簡素化** - 依存関係の更新不要

### デメリット
1. **メンテナンスの負担** - StarryDigitizerの更新を手動で取り込む必要
2. **コードの重複** - 他のプロジェクトでも使う場合は重複
3. **ライセンスの考慮** - コード統合時のライセンス遵守

### 実装手順

#### ステップ1: コードのコピー（1日）
1. StarryDigitizerの全ソースコードをStarrydata2にコピー
   ```
   starrydata2/
   ├── src/
   │   ├── starry-digitizer/  # StarryDigitizerのコード
   │   │   ├── domain/
   │   │   ├── application/
   │   │   ├── presentation/
   │   │   └── infrastructure/
   │   └── starrydata/        # Starrydata2の既存コード
   ```

2. 依存関係の統合
   - package.jsonの依存関係をマージ
   - ビルド設定の調整

#### ステップ2: 統合とカスタマイズ（2-3日）
1. **データモデルの直接拡張**
   ```typescript
   // starrydata2/src/starry-digitizer/domain/models/axis/axisInterface.ts
   export interface AxisInterface {
     // 既存フィールド
     name: string
     coord: Coord
     value: number
     
     // Starrydata2用の追加フィールド
     label: string
     unit: string
     property?: string
     metadata?: any  // Starrydata2固有のメタデータ
   }
   ```

2. **UIコンポーネントの直接修正**
   - AxisSetSettingsに軸プロパティフィールドを直接追加
   - Starrydata2のUIフレームワークに合わせて調整

3. **データ保存の統合**
   ```typescript
   // StarryDigitizerのデータをStarrydata2のストアに直接保存
   import { useStarrydataStore } from '@/starrydata/stores'
   
   const saveToStarrydata = (data: ChartData) => {
     const store = useStarrydataStore()
     store.saveChart({
       ...data,
       imageData: canvas.toDataURL(),
       timestamp: Date.now()
     })
   }
   ```

#### ステップ3: 機能の深い統合（1-2日）
1. **共通コンポーネントの利用**
   - Starrydata2の既存UIコンポーネントを活用
   - 統一されたスタイリング

2. **状態管理の統合**
   - StarryDigitizerの状態をStarrydata2のストアで管理
   - リアクティブな更新

3. **直接的なデータフロー**
   ```typescript
   // 画像保存ボタンのハンドラー
   const handleSave = () => {
     const chartData = {
       datasets: datasetRepository.getAll(),
       axisInfo: {
         x: { label: xAxisLabel.value, unit: xAxisUnit.value },
         y: { label: yAxisLabel.value, unit: yAxisUnit.value }
       },
       image: getCanvasImage()
     }
     
     // Starrydata2のAPIを直接呼び出し
     starrydataAPI.saveChart(chartData)
   }
   ```

### 推奨アプローチの比較

| 項目 | NPMパッケージ方式 | コード統合方式 |
|------|------------------|----------------|
| 実装の複雑さ | 高（インターフェース設計必要） | 低（直接修正可能） |
| メンテナンス | 容易（npm update） | 困難（手動更新） |
| カスタマイズ性 | 制限あり | 完全に自由 |
| 開発速度 | 遅い | 速い |
| 将来の拡張性 | 高い | 低い |

### 結論
**短期的には「コード統合方式」が推奨**される理由：
1. Starrydata2固有の要件に完全に対応可能
2. 開発速度が速い
3. 複雑なインターフェース設計が不要
4. デバッグとテストが容易

ただし、将来的に他のプロジェクトでもStarryDigitizerを使用する予定がある場合は、NPMパッケージ方式の方が長期的には有利。

## 技術的考慮事項

### セキュリティ
- postMessageのorigin検証
- データバリデーション
- XSS対策

### パフォーマンス
- 大きな画像データの効率的な転送
- メモリ使用量の最適化

### 互換性
- 既存のStarryDigitizer利用者への影響を最小化
- オプショナルな機能として実装

## リスクと対策

1. **データサイズの問題**
   - リスク：大きな画像データの転送でパフォーマンス低下
   - 対策：画像圧縮、プログレッシブ転送

2. **バージョン互換性**
   - リスク：StarryDigitizerの更新による破壊的変更
   - 対策：バージョニング戦略、後方互換性の維持

3. **統合の複雑性**
   - リスク：異なるフレームワーク間の統合困難
   - 対策：アダプターパターンの使用、明確なインターフェース定義

## 成功指標
- 軸プロパティと単位がStarrydata2に正しく保存される
- 画像データが劣化なく転送・保存される
- 既存機能への影響がない
- ユーザー体験の向上（シームレスな操作）

## タイムライン
- 総期間：約10-12営業日
- フェーズ1: 2日
- フェーズ2: 4日
- フェーズ3: 3日
- フェーズ4: 2日
- バッファ: 1-2日