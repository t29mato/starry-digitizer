import {
  AxisExtractorInterface,
  AxisExtractionResult,
  DetectedAxis,
  DetectedRegion,
} from "./axisExtractorInterface";
import { AxisExtractorAdapter } from "./adapters/axisExtractorAdapter";
import { BrowserAdapter } from "./adapters/browserAdapter";
import { NodeAdapter } from "./adapters/nodeAdapter";

export interface UnifiedAxisExtractionOptions {
  useImprovedMode?: boolean;
  confidenceThreshold?: number;
  forceAdapter?: "browser" | "node";
  debug?: boolean;
  lineTolerance?: number; // Tolerance for line connection detection (default: 20)
  colorThreshold?: number; // RGB threshold for detecting dark lines (default: 50)
}

export class UnifiedAxisExtractor implements AxisExtractorInterface {
  private adapter: AxisExtractorAdapter;
  private options: UnifiedAxisExtractionOptions;

  constructor(options: UnifiedAxisExtractionOptions = {}) {
    this.options = {
      useImprovedMode: false,
      confidenceThreshold: 40,
      debug: false,
      lineTolerance: 20,
      colorThreshold: 50,
      ...options,
    };

    this.adapter = this.createAdapter();
  }

  private createAdapter(): AxisExtractorAdapter {
    // 強制指定がある場合
    if (this.options.forceAdapter === "browser") {
      return new BrowserAdapter(this.options);
    }
    if (this.options.forceAdapter === "node") {
      return new NodeAdapter();
    }

    // 環境自動判定
    const nodeAdapter = new NodeAdapter();
    const browserAdapter = new BrowserAdapter(this.options);

    if (
      nodeAdapter.isEnvironmentSupported() &&
      !browserAdapter.isEnvironmentSupported()
    ) {
      return nodeAdapter;
    } else {
      return browserAdapter;
    }
  }

  getAdapter(): AxisExtractorAdapter {
    return this.adapter;
  }

  getOptions(): UnifiedAxisExtractionOptions {
    return this.options;
  }

  setDebug(debug: boolean): void {
    this.options.debug = debug;
    // If adapter is BrowserAdapter, update its debug mode
    if (this.adapter instanceof BrowserAdapter) {
      (this.adapter as any).options = { ...this.options };
      // Clear OCR regions when toggling debug mode
      if (!debug) {
        (this.adapter as any).clearOCRRegions();
      }
    }
  }

  setLineTolerance(tolerance: number): void {
    this.options.lineTolerance = tolerance;
    // If adapter is BrowserAdapter, update its tolerance
    if (this.adapter instanceof BrowserAdapter) {
      (this.adapter as any).options = { ...this.options };
    }
  }

  setColorThreshold(threshold: number): void {
    this.options.colorThreshold = threshold;
    // If adapter is BrowserAdapter, update its color threshold
    if (this.adapter instanceof BrowserAdapter) {
      (this.adapter as any).options = { ...this.options };
    }
  }

  getEnvironmentInfo(): { name: string; adapter: string } {
    return {
      name: this.adapter.getEnvironmentName(),
      adapter: this.adapter.constructor.name,
    };
  }

  // ファイルから軸抽出（Node.js用）
  async extractAxisInformationFromFile(
    filePath: string,
  ): Promise<AxisExtractionResult | null> {
    if (!this.adapter.loadImageFromFile) {
      throw new Error(
        `File loading not supported by ${this.adapter.getEnvironmentName()} adapter`,
      );
    }

    try {
      const imageSource = await this.adapter.loadImageFromFile(filePath);
      return await this.extractAxisInformationFromSource(imageSource);
    } catch (error) {
      console.error("Error extracting axis information from file:", error);
      return null;
    }
  }

  // Canvas从轴抽取（Browser用）
  async extractAxisInformationFromCanvas(
    canvas: HTMLCanvasElement,
  ): Promise<AxisExtractionResult | null> {
    if (!this.adapter.loadImageFromCanvas) {
      throw new Error(
        `Canvas loading not supported by ${this.adapter.getEnvironmentName()} adapter`,
      );
    }

    try {
      const imageSource = await this.adapter.loadImageFromCanvas(canvas);
      return await this.extractAxisInformationFromSource(imageSource);
    } catch (error) {
      console.error("Error extracting axis information from canvas:", error);
      return null;
    }
  }

  // ImageDataから軸抽出（Browser用、既存インターフェース互換）
  async extractAxisInformation(
    imageData: ImageData,
  ): Promise<AxisExtractionResult | null> {
    try {
      return await this.extractAxisInformationFromSource(imageData);
    } catch (error) {
      console.error("Error extracting axis information from ImageData:", error);
      return null;
    }
  }

  // 統一されたコアロジック
  private async extractAxisInformationFromSource(
    imageSource: any,
  ): Promise<AxisExtractionResult | null> {
    try {
      // Clear previous OCR regions if in debug mode
      if (this.options.debug && this.adapter instanceof BrowserAdapter) {
        (this.adapter as any).clearOCRRegions();
      }

      // Step 1: 軸を検出
      const detectedAxes = await this.adapter.detectAxes(imageSource);

      if (!detectedAxes.horizontalAxis && !detectedAxes.verticalAxis) {
        return null;
      }

      // Check if plot area was detected
      if (!detectedAxes.plotArea) {
        console.warn(
          "No plot area detected. Continuing with axis extraction anyway.",
        );
      }

      // Step 2: 軸の値を抽出
      let x1 = 0,
        x2 = 1,
        y1 = 0,
        y2 = 1;
      let horizontalRegion: DetectedRegion | undefined;
      let verticalRegion: DetectedRegion | undefined;

      if (detectedAxes.horizontalAxis) {
        const extractionResult = await this.extractTickValuesFromAxis(
          imageSource,
          detectedAxes.horizontalAxis,
          "horizontal",
        );
        horizontalRegion = extractionResult.region;
        if (extractionResult.values.length >= 2) {
          x1 = Math.min(...extractionResult.values);
          x2 = Math.max(...extractionResult.values);
        } else if (extractionResult.values.length === 1) {
          // If we only found one value, try to infer the range
          const val = extractionResult.values[0];
          if (val === 0) {
            x1 = 0;
            x2 = this.inferMaxValue(val, "horizontal");
          } else {
            x1 = 0;
            x2 = val;
          }
        } else {
          // No values found, use heuristic defaults based on axis type
          x1 = 0;
          x2 = this.getDefaultMaxValue("horizontal");
        }
      }

      if (detectedAxes.verticalAxis) {
        const extractionResult = await this.extractTickValuesFromAxis(
          imageSource,
          detectedAxes.verticalAxis,
          "vertical",
        );
        verticalRegion = extractionResult.region;
        if (extractionResult.values.length >= 2) {
          y1 = Math.min(...extractionResult.values);
          y2 = Math.max(...extractionResult.values);
        } else if (extractionResult.values.length === 1) {
          // If we only found one value, try to infer the range
          const val = extractionResult.values[0];
          if (val === 0) {
            y1 = 0;
            y2 = this.inferMaxValue(val, "vertical");
          } else {
            y1 = 0;
            y2 = val;
          }
        } else {
          // No values found, use heuristic defaults based on axis type
          y1 = 0;
          y2 = this.getDefaultMaxValue("vertical");
        }
      }

      const result: AxisExtractionResult = {
        x1,
        x2,
        y1,
        y2,
        horizontalRegion,
        verticalRegion,
        plotArea: (detectedAxes as any).plotArea,
      };

      // Always include OCR regions for coordinate import
      if (this.adapter instanceof BrowserAdapter) {
        // Refine OCR regions using OpenCV
        await (this.adapter as any).refineOCRRegions();

        // Re-classify regions based on final x1, x2, y1, y2 values
        const ocrRegions = (this.adapter as any).getOCRRegions() as any[];

        // Get detected rectangles for debug visualization
        result.detectedRectangles = (
          this.adapter as any
        ).getDetectedRectangles();

        result.ocrRegions = ocrRegions.map((region) => {
          // Calculate center of mass
          region.centerX = region.x + region.width / 2;
          region.centerY = region.y + region.height / 2;

          // Re-classify based on final values
          if (region.type !== "other") {
            const value = parseFloat(region.text);
            if (!isNaN(value)) {
              if (region.type.startsWith("x")) {
                if (Math.abs(value - x1) < 0.001) {
                  region.type = "x1";
                  // For horizontal axis, the pixel position is the centerX
                  region.axisPixelPosition = region.centerX;
                } else if (Math.abs(value - x2) < 0.001) {
                  region.type = "x2";
                  region.axisPixelPosition = region.centerX;
                }
              } else if (region.type.startsWith("y")) {
                if (Math.abs(value - y1) < 0.001) {
                  region.type = "y1";
                  // For vertical axis, the pixel position is the centerY
                  region.axisPixelPosition = region.centerY;
                } else if (Math.abs(value - y2) < 0.001) {
                  region.type = "y2";
                  region.axisPixelPosition = region.centerY;
                }
              }
            }
          }
          return region;
        });

        // Calculate pixel-to-value mapping if we have both x1 and x2 (or y1 and y2)
        const x1Region = result.ocrRegions.find((r) => r.type === "x1");
        const x2Region = result.ocrRegions.find((r) => r.type === "x2");
        const y1Region = result.ocrRegions.find((r) => r.type === "y1");
        const y2Region = result.ocrRegions.find((r) => r.type === "y2");

        // Create axis pixel mapping
        result.axisPixelMapping = {};

        if (
          x1Region &&
          x2Region &&
          x1Region.axisPixelPosition &&
          x2Region.axisPixelPosition
        ) {
          const pixelDistance =
            x2Region.axisPixelPosition - x1Region.axisPixelPosition;
          const valueDistance = x2 - x1;
          const pixelsPerUnit = pixelDistance / valueDistance;

          result.axisPixelMapping.horizontal = {
            x1Pixel: x1Region.axisPixelPosition,
            x2Pixel: x2Region.axisPixelPosition,
            pixelsPerUnit: pixelsPerUnit,
          };
        }

        if (
          y1Region &&
          y2Region &&
          y1Region.axisPixelPosition &&
          y2Region.axisPixelPosition
        ) {
          const pixelDistance = Math.abs(
            y2Region.axisPixelPosition - y1Region.axisPixelPosition,
          );
          const valueDistance = y2 - y1;
          const pixelsPerUnit = pixelDistance / valueDistance;

          result.axisPixelMapping.vertical = {
            y1Pixel: y1Region.axisPixelPosition,
            y2Pixel: y2Region.axisPixelPosition,
            pixelsPerUnit: pixelsPerUnit,
          };
        }
      }

      return result;
    } catch (error) {
      console.error("Error in unified axis extraction:", error);
      return null;
    }
  }

  private async extractTickValuesFromAxis(
    imageSource: any,
    axis: any,
    orientation: "horizontal" | "vertical",
  ): Promise<{ values: number[]; region: DetectedRegion }> {
    try {
      const imageWidth = this.getImageWidth(imageSource);
      const imageHeight = this.getImageHeight(imageSource);

      let regionX: number,
        regionY: number,
        regionWidth: number,
        regionHeight: number;

      if (orientation === "horizontal") {
        // X軸領域の設定
        regionHeight = Math.floor(imageHeight * 0.08);
        regionY = Math.min(
          axis.y + Math.floor(imageHeight * 0.005),
          imageHeight - regionHeight,
        );
        regionX = axis.x1 || 0;
        regionWidth = imageWidth - regionX;
      } else {
        // Y軸領域の設定
        const desiredRoiWidth = Math.floor(imageWidth * 0.12);
        const minWidth = Math.floor(imageWidth * 0.05);
        const maxRoiWidth = Math.max(
          (axis.x || 0) - Math.floor(imageWidth * 0.02),
          minWidth,
        );
        regionWidth = Math.min(desiredRoiWidth, maxRoiWidth);
        regionX = (axis.x || 0) - regionWidth;
        regionY = 0;
        regionHeight = axis.y2 || imageHeight;
      }

      let extractedText: string;
      let extractedValues: number[];

      if (
        this.options.useImprovedMode &&
        this.adapter.extractTextFromMultipleRegions
      ) {
        // 改善版: 複数領域での抽出
        const result = await this.extractWithMultipleRegions(
          imageSource,
          regionX,
          regionY,
          regionWidth,
          regionHeight,
          orientation,
        );
        extractedText = result.text;
        extractedValues = this.extractNumbers(result.text);
      } else {
        // シンプル版: 単一領域での抽出
        const result = await this.adapter.extractTextFromRegion(
          imageSource,
          regionX,
          regionY,
          regionWidth,
          regionHeight,
          { psm: 6, orientation },
        );
        extractedText = result.text;
        extractedValues = this.extractNumbers(result.text);

        // If horizontal axis and not enough values, try to extract from multiple sections
        if (orientation === "horizontal" && extractedValues.length < 4) {
          const additionalValues: number[] = [];
          const sectionWidth = Math.floor(regionWidth / 3);

          // Extract from middle section
          const middleResult = await this.adapter.extractTextFromRegion(
            imageSource,
            regionX + sectionWidth,
            regionY,
            sectionWidth,
            regionHeight,
            { psm: 6, orientation },
          );
          additionalValues.push(...this.extractNumbers(middleResult.text));

          // Extract from right section
          const rightResult = await this.adapter.extractTextFromRegion(
            imageSource,
            regionX + sectionWidth * 2,
            regionY,
            sectionWidth,
            regionHeight,
            { psm: 6, orientation },
          );
          additionalValues.push(...this.extractNumbers(rightResult.text));

          // Combine all values
          extractedValues = [
            ...new Set([...extractedValues, ...additionalValues]),
          ].sort((a, b) => a - b);
          extractedText =
            `${result.text} ${middleResult.text} ${rightResult.text}`.trim();
        }
      }

      const detectedRegion: DetectedRegion = {
        x: regionX,
        y: regionY,
        width: regionWidth,
        height: regionHeight,
        extractedText,
        extractedValues: [...extractedValues].sort((a, b) => a - b),
        axisPosition:
          orientation === "horizontal" ? { y: axis.y } : { x: axis.x },
      };

      return {
        values: [...extractedValues].sort((a, b) => a - b),
        region: detectedRegion,
      };
    } catch (error) {
      console.error("Error extracting tick values:", error);
      return {
        values: [],
        region: {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          extractedText: "",
          extractedValues: [],
        },
      };
    }
  }

  private async extractWithMultipleRegions(
    imageSource: any,
    x: number,
    y: number,
    width: number,
    height: number,
    orientation: "horizontal" | "vertical",
  ): Promise<{ text: string; regions: string[] }> {
    if (!this.adapter.extractTextFromMultipleRegions) {
      // フォールバック: 単一領域で処理
      const result = await this.adapter.extractTextFromRegion(
        imageSource,
        x,
        y,
        width,
        height,
        { orientation },
      );
      return { text: result.text, regions: [result.text] };
    }

    const regions = [];

    if (orientation === "vertical") {
      // Y軸: 複数領域に分割
      regions.push(
        // 全領域
        { x, y, width, height, psm: 6 },
        // 上部
        { x, y, width, height: Math.floor(height / 3), psm: 6 },
        // 中部
        {
          x,
          y: y + Math.floor(height / 3),
          width,
          height: Math.floor(height / 3),
          psm: 6,
        },
        // 下部
        {
          x,
          y: y + Math.floor((height * 2) / 3),
          width,
          height: height - Math.floor((height * 2) / 3),
          psm: 6,
        },
        // 上部30%（単語モード）
        { x, y, width, height: Math.floor(height * 0.3), psm: 8 },
      );
    } else {
      // X軸: 単一領域（改善の余地あり）
      regions.push({ x, y, width, height, psm: 6 });
    }

    return await this.adapter.extractTextFromMultipleRegions(
      imageSource,
      regions,
    );
  }

  private extractNumbers(text: string): number[] {
    const numbers: number[] = [];

    // Clean the text first - remove common OCR artifacts
    const cleanedText = text
      .replace(/[oO]/g, "0") // Common OCR mistake: O -> 0
      .replace(/[lI|]/g, "1") // Common OCR mistake: l,I,| -> 1
      .replace(/[sS]/g, "5") // Common OCR mistake: s,S -> 5
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();

    const patterns = [
      /-?\d+\.?\d*/g, // 標準的な数字 (negative and decimal)
      /\d+/g, // 整数のみ
      /\d+\.\d+/g, // 小数のみ
    ];

    const allMatches = new Set<string>();

    for (const pattern of patterns) {
      const matches = cleanedText.match(pattern);
      if (matches) {
        matches.forEach((match) => allMatches.add(match));
      }
    }

    for (const match of allMatches) {
      const num = parseFloat(match);
      if (!isNaN(num) && num >= -1000 && num <= 10000) {
        // Allow negative numbers for some axes
        numbers.push(num);
      }
    }

    // If we have no numbers but the text contains expected patterns, try harder
    if (numbers.length === 0 && text.length > 0) {
      // Try to extract any sequence that looks like a number
      const aggressivePattern = /[-]?\d+(?:\.\d+)?/g;
      const aggressiveMatches = cleanedText.match(aggressivePattern);
      if (aggressiveMatches) {
        aggressiveMatches.forEach((match) => {
          const num = parseFloat(match);
          if (!isNaN(num)) {
            numbers.push(num);
          }
        });
      }
    }

    return [...new Set(numbers)].sort((a, b) => a - b);
  }

  private getImageWidth(imageSource: any): number {
    if (imageSource.width !== undefined) return imageSource.width;
    if (imageSource.canvas?.width !== undefined)
      return imageSource.canvas.width;
    return 800; // デフォルト値
  }

  private getImageHeight(imageSource: any): number {
    if (imageSource.height !== undefined) return imageSource.height;
    if (imageSource.canvas?.height !== undefined)
      return imageSource.canvas.height;
    return 600; // デフォルト値
  }

  // 既存インターフェース互換のためのメソッド群
  async detectAxes(imageData: ImageData): Promise<DetectedAxis> {
    return await this.adapter.detectAxes(imageData);
  }

  async extractTickValues(
    imageData: ImageData,
    axis: any,
    orientation: "horizontal" | "vertical",
  ): Promise<number[]> {
    const result = await this.extractTickValuesFromAxis(
      imageData,
      axis,
      orientation,
    );
    return result.values;
  }

  async extractTickValuesWithRegion(
    imageData: ImageData,
    axis: any,
    orientation: "horizontal" | "vertical",
  ): Promise<{ values: number[]; region: DetectedRegion }> {
    return await this.extractTickValuesFromAxis(imageData, axis, orientation);
  }

  private inferMaxValue(
    baseValue: number,
    orientation: "horizontal" | "vertical",
  ): number {
    // Common patterns for axis ranges
    if (baseValue === 0) {
      // Common max values when min is 0
      if (orientation === "horizontal") {
        return 1000; // Common for cycle numbers, temperature in K
      } else {
        return 200; // Common for capacity, coefficient values
      }
    }
    // If we have a non-zero value, assume it might be max
    return baseValue * 10;
  }

  private getDefaultMaxValue(orientation: "horizontal" | "vertical"): number {
    // Default values based on common scientific plots
    if (orientation === "horizontal") {
      return 1000; // Common for x-axis (time, temperature, cycles)
    } else {
      return 100; // Common for y-axis (percentage, coefficient)
    }
  }
}
