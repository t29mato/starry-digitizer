# JavaScript OCRにおけるバウンディングボックスの制限事項

## 概要

本ドキュメントでは、Tesseract.js を使用したOCR処理において、個々の文字や単語のバウンディングボックスが正しく取得できない問題とその対処法について記述します。

## 問題の詳細

### 期待された動作
グラフの軸ラベル（x1, x2, y1, y2）を検出し、各数値の正確な位置を特定するため、Tesseract.jsのword-level bounding boxesを使用しようとしました。

### 実際の動作
```javascript
// Tesseract.jsの結果
{
  hasWords: false,
  wordCount: 0,
  words: []
}
```

Tesseract.jsは、テキストを正しく認識しているにも関わらず（例：`"1 2 3 4 5"`）、個々の単語のバウンディングボックス情報を返しませんでした。

## 実装した解決策

### 1. OCR領域全体から数値を抽出

```javascript
const result = await Tesseract.recognize(canvas, 'eng', {
  psm: options.psm || 6,
  logger: () => {},
})

const text = result.data.text.trim()
// 例: "1 2 3 4 5\nxX" (X軸)
// 例: "14\n12\n10\n\n>\n8\n6\n4" (Y軸)
```

### 2. テキストから数値を抽出

```javascript
private extractNumbers(text: string): number[] {
  const numbers: number[] = []
  
  // OCRの一般的な誤認識を修正
  const cleanedText = text
    .replace(/[oO]/g, '0')     // O → 0
    .replace(/[lI\|]/g, '1')   // l,I,| → 1
    .replace(/[sS]/g, '5')     // s,S → 5
    .replace(/\s+/g, ' ')
    .trim()
  
  const patterns = [
    /-?\d+\.?\d*/g,    // 標準的な数字（負数・小数含む）
    /\d+/g,            // 整数のみ
    /\d+\.\d+/g,       // 小数のみ
  ]
  
  const allMatches = new Set<string>()
  
  for (const pattern of patterns) {
    const matches = cleanedText.match(pattern)
    if (matches) {
      matches.forEach((match) => allMatches.add(match))
    }
  }
  
  for (const match of allMatches) {
    const num = parseFloat(match)
    if (!isNaN(num)) {
      numbers.push(num)
    }
  }
  
  return [...new Set(numbers)].sort((a, b) => a - b)
}
```

### 3. 数値の位置を推定

個々の文字のバウンディングボックスが取得できないため、OCR領域全体から数値の位置を推定する方法を実装しました。

```javascript
private estimateNumberPositions(
  text: string,
  numbers: number[],
  regionX: number,
  regionY: number,
  regionWidth: number,
  regionHeight: number,
  orientation?: 'horizontal' | 'vertical'
): void {
  if (orientation === 'horizontal') {
    // X軸の場合：数値を水平方向に均等配置
    const uniqueNumbers = [...new Set(numbers)].sort((a, b) => a - b)
    const count = uniqueNumbers.length
    
    if (count > 0) {
      const estimatedWidth = regionWidth / count
      const estimatedHeight = regionHeight * 0.8
      
      uniqueNumbers.forEach((num, index) => {
        const estimatedX = regionX + (index * estimatedWidth)
        const estimatedY = regionY + regionHeight * 0.1
        
        this.ocrRegions.push({
          x: estimatedX,
          y: estimatedY,
          width: estimatedWidth * 0.8,
          height: estimatedHeight,
          text: num.toString(),
          type: this.classifyNumber(num) // x1, x2, etc.
        })
      })
    }
  } else if (orientation === 'vertical') {
    // Y軸の場合：数値を垂直方向に均等配置
    const uniqueNumbers = [...new Set(numbers)].sort((a, b) => b - a)
    const count = uniqueNumbers.length
    
    if (count > 0) {
      const estimatedHeight = regionHeight / count
      const estimatedWidth = regionWidth * 0.8
      
      uniqueNumbers.forEach((num, index) => {
        const estimatedX = regionX + regionWidth * 0.1
        const estimatedY = regionY + (index * estimatedHeight)
        
        this.ocrRegions.push({
          x: estimatedX,
          y: estimatedY,
          width: estimatedWidth,
          height: estimatedHeight * 0.8,
          text: num.toString(),
          type: this.classifyNumber(num) // y1, y2, etc.
        })
      })
    }
  }
}
```

### 4. 重心から軸上のピクセル位置を計算

推定されたバウンディングボックスの重心を使用して、より正確な軸上の位置を特定します。

```javascript
// 各OCR領域の重心を計算
region.centerX = region.x + region.width / 2
region.centerY = region.y + region.height / 2

// 軸上のピクセル位置を記録
if (orientation === 'horizontal') {
  region.axisPixelPosition = region.centerX
} else {
  region.axisPixelPosition = region.centerY
}

// ピクセルと値のマッピングを作成
if (x1Region && x2Region) {
  const pixelDistance = x2Region.axisPixelPosition - x1Region.axisPixelPosition
  const valueDistance = x2 - x1
  const pixelsPerUnit = pixelDistance / valueDistance
  
  // 任意のピクセル位置から値を計算可能
  // value = x1 + (pixelX - x1Pixel) / pixelsPerUnit
}
```

## 結果

### デバッグ表示

```javascript
// デバッグモードで各数値の推定位置を可視化
drawOCRRegions(ctx: CanvasRenderingContext2D) {
  this.ocrRegions.forEach(region => {
    // 色分け
    switch (region.type) {
      case 'x1': ctx.strokeStyle = '#FF0000'; break  // 赤
      case 'x2': ctx.strokeStyle = '#00CC00'; break  // 緑
      case 'y1': ctx.strokeStyle = '#0066FF'; break  // 青
      case 'y2': ctx.strokeStyle = '#CC00CC'; break  // 紫
    }
    
    // バウンディングボックスを描画
    ctx.strokeRect(region.x, region.y, region.width, region.height)
    
    // 重心に十字マークを描画
    if (region.centerX && region.centerY) {
      ctx.beginPath()
      ctx.moveTo(region.centerX - 5, region.centerY)
      ctx.lineTo(region.centerX + 5, region.centerY)
      ctx.moveTo(region.centerX, region.centerY - 5)
      ctx.lineTo(region.centerX, region.centerY + 5)
      ctx.stroke()
    }
  })
}
```

## 制限事項と今後の改善点

1. **位置の精度**: 均等配置による推定のため、実際の文字位置とは差異がある
2. **フォントサイズの推定**: OCR領域のサイズから推定しているため、実際のフォントサイズとは異なる
3. **不規則な配置への対応**: 数値が等間隔でない場合の対応が困難

## 代替案の検討

1. **サーバーサイドOCR**: Node.jsでTesseractのネイティブ版を使用すれば、より詳細な情報が取得可能
2. **画像処理による文字検出**: OpenCV.jsを使用して文字領域を直接検出
3. **機械学習モデル**: 文字検出に特化したモデル（EAST、CRAFTなど）の使用

## まとめ

Tesseract.jsでは個々の文字のバウンディングボックスが取得できないという制限があることが判明しました。この問題に対して、OCR領域全体から数値を抽出し、位置を推定する方法で対処しました。完全に正確ではありませんが、グラフの軸情報抽出という用途では実用的なレベルの精度を達成できました。