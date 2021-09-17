<template>
  <v-container>
    <v-file-input
      accept="image/*"
      label="file input"
      @change="loadImage"
    ></v-file-input>
    <template v-if="uploadImageUrl">
      <v-row>
        <v-col cols="9">
          <div :style="{ position: 'relative' }">
            <!-- INFO: plot対象画像 -->
            <canvas
              id="graph"
              :style="{
                cursor: 'crosshair',
                'user-drag': 'none',
                border: 'solid 1px grey',
              }"
              :src="uploadImageUrl"
              @click="plot"
              @mousemove="mouseMove"
            ></canvas>
            <v-btn @click="clearAxes">座標軸をクリア</v-btn>
            <!-- TODO: プロットの透明度を変更できるようにする -->
            <!-- TODO: プロットの色を変更できるようにする -->
            <v-btn @click="clearPoints">プロットをクリア</v-btn>
            <v-btn @click="shouldShowPoints = !shouldShowPoints">{{
              shouldShowPoints ? 'プロットを非表示' : 'プロットを表示'
            }}</v-btn>
            <div v-for="(axis, index) in coordAxes" :key="'coordAxes' + index">
              <!-- INFO: 座標軸の点 -->
              <div
                :style="{
                  position: 'absolute',
                  top: `${axis.yPx}px`,
                  left: `${axis.xPx}px`,
                  'pointer-events': 'none',
                  width: '10px',
                  height: '10px',
                  'border-radius': '50%',
                  'background-color': coordAxes.length === 4 ? 'black' : 'red',
                }"
              ></div>
              <!-- INFO: 座標軸名 -->
              <span
                :style="{
                  position: 'absolute',
                  top: `${axis.yPx - 7}px`,
                  left: `${axis.xPx + 12}px`,
                  'pointer-events': 'none',
                }"
                >{{ showAxisName(index) }}</span
              >
            </div>
            <div
              v-for="point in points"
              v-show="shouldShowPoints"
              :key="point.id"
            >
              <!-- INFO: プロットデータ -->
              <div
                :style="{
                  position: 'absolute',
                  top: `${point.yPx}px`,
                  left: `${point.xPx}px`,
                  'pointer-events': 'none',
                  width: '10px',
                  height: '10px',
                  'border-radius': '50%',
                  'background-color': 'red',
                }"
              ></div>
            </div>
            <!-- INFO: カーソル横の文字 -->
            <div
              v-if="coordAxes.length < 4"
              :style="{
                position: 'absolute',
                left: `${cursorOnGraph.xPx + 7}px`,
                top: `${cursorOnGraph.yPx - 12}px`,
                'pointer-events': 'none',
              }"
            >
              {{ showAxisName(coordAxes.length) }}
            </div>
          </div>
        </v-col>
        <!-- INFO: 拡大鏡 -->
        <v-col>
          <div
            :style="{
              overflow: 'hidden',
              width: '200px',
              height: '200px',
              position: 'relative',
              border: '1px solid grey',
            }"
          >
            <!-- INFO: 拡大鏡の画像 -->
            <img
              :src="uploadImageUrl"
              :style="{
                transform: `scale(${scale}) translate(-${
                  cursorOnGraph.xPx - circleRadiusScaledPx
                }px, -${cursorOnGraph.yPx - circleRadiusScaledPx}px)`,
                'transform-origin': 'top left',
              }"
            />
            <!-- INFO: 拡大鏡の縦線 -->
            <div
              :style="{
                position: 'absolute',
                top: '0px',
                left: '0px',
                width: '99px',
                height: '200px',
                'border-right': '1px solid grey',
              }"
            ></div>
            <!-- INFO: 拡大鏡の横線 -->
            <div
              :style="{
                position: 'absolute',
                top: '0px',
                left: '0px',
                width: '200px',
                height: '99px',
                'border-bottom': '1px solid grey',
              }"
            ></div>
            <!-- INFO: 拡大鏡の座標軸 -->
            <div v-for="(axis, index) in coordAxes" :key="'coordAxes' + index">
              <div
                :style="{
                  position: 'absolute',
                  top: `${axis.yPx * scale}px`,
                  left: `${axis.xPx * scale}px`,
                  'pointer-events': 'none',
                  transform: `scale(${scale}) translate(-${
                    cursorOnGraph.xPx - circleRadiusScaledPx
                  }px, -${cursorOnGraph.yPx - circleRadiusScaledPx}px)`,
                  'transform-origin': 'top left',
                  width: '10px',
                  height: '10px',
                  'border-radius': '50%',
                  'background-color': coordAxes.length === 4 ? 'black' : 'red',
                }"
              ></div>
              <span
                :style="{
                  position: 'absolute',
                  top: `${(axis.yPx - 7) * scale}px`,
                  left: `${(axis.xPx + 12) * scale}px`,
                  'pointer-events': 'none',
                  transform: `scale(${scale}) translate(-${
                    cursorOnGraph.xPx - circleRadiusScaledPx
                  }px, -${cursorOnGraph.yPx - circleRadiusScaledPx}px)`,
                  'transform-origin': 'top left',
                }"
                >{{ showAxisName(index) }}</span
              >
            </div>
            <div
              v-for="point in points"
              v-show="shouldShowPoints"
              :key="point.id"
            >
              <!-- INFO: プロットデータ -->
              <div
                :style="{
                  position: 'absolute',
                  top: `${point.yPx * scale}px`,
                  left: `${point.xPx * scale}px`,
                  transform: `scale(${scale}) translate(-${
                    cursorOnGraph.xPx - circleRadiusScaledPx
                  }px, -${cursorOnGraph.yPx - circleRadiusScaledPx}px)`,
                  'transform-origin': 'top left',
                  'pointer-events': 'none',
                  width: '10px',
                  height: '10px',
                  'border-radius': '50%',
                  'background-color': 'red',
                }"
              ></div>
            </div>
          </div>
          <div v-if="coordAxes.length === 4">
            {{
              `x: ${
                calculateValueFromPixel(cursorOnGraph.xPx, cursorOnGraph.yPx).xV
              }`
            }}<br />
            {{
              `y: ${
                calculateValueFromPixel(cursorOnGraph.xPx, cursorOnGraph.yPx).yV
              }`
            }}
          </div>
          <v-slider
            v-model="scale"
            thumb-label="always"
            max="10"
            min="2"
            label="拡大鏡倍率"
          ></v-slider>
          <v-slider
            v-model="detectRangePx"
            thumb-label="always"
            max="10"
            min="2"
            label="検出範囲（px）"
          ></v-slider>
          <v-slider
            v-model="detectDifferencePct"
            thumb-label="always"
            max="100"
            min="1"
            label="検出色誤差（%）"
          ></v-slider>
          <v-slider
            v-model="pointsDistancePx"
            thumb-label="always"
            max="100"
            min="1"
            label="点間距離 （px）"
          ></v-slider>
          <v-color-picker v-model="colorPicker" class="ma-2"></v-color-picker>
          <v-btn :loading="isDetecting" @click="detectPointByColor"
            >検出する</v-btn
          >
          <div v-if="coordAxes.length === 4">
            <v-row>
              <v-col vols="6">
                <v-text-field
                  label="x1"
                  type="number"
                  :value="coordAxesValue[indexX1]"
                  @input="inputX1Value"
                ></v-text-field>
              </v-col>
              <v-col vols="6">
                <v-text-field
                  label="x2"
                  type="number"
                  :value="coordAxesValue[indexX2]"
                  @input="inputX2Value"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col vols="6">
                <v-text-field
                  label="y1b"
                  type="number"
                  :value="coordAxesValue[indexY1]"
                  @input="inputY1Value"
                ></v-text-field>
              </v-col>
              <v-col vols="6">
                <v-text-field
                  label="y2"
                  type="number"
                  :value="coordAxesValue[indexY2]"
                  @input="inputY2Value"
                ></v-text-field>
              </v-col>
            </v-row>
          </div>
        </v-col>
      </v-row>
    </template>
    <v-simple-table v-if="points.length > 0 && coordAxes.length === 4">
      <template #default>
        <thead>
          <tr>
            <th>X</th>
            <th>Y</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="point in points" v-show="shouldShowPoints" :key="point.id">
            <td>{{ calculateValueFromPixel(point.xPx, point.yPx).xV }}</td>
            <td>{{ calculateValueFromPixel(point.xPx, point.yPx).yV }}</td>
          </tr>
        </tbody>
      </template>
    </v-simple-table>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import diff from 'color-diff'

const circleRadiusPx = 5
const [indexX1, indexX2, indexY1, indexY2] = [0, 1, 2, 3]

export default Vue.extend({
  data() {
    return {
      uploadImageUrl: '/img/sample_graph.png',
      coordAxes: [] as {
        xPx: number
        yPx: number
      }[],
      coordAxesValue: [0, 1, 0, 1] as number[],
      cursorOnGraph: {
        xPx: 0,
        yPx: 0,
      },
      color: 'red',
      scale: 5,
      // REFACTOR: points -> dots
      points: [] as { id: number; xPx: number; yPx: number }[],
      indexX1,
      indexX2,
      indexY1,
      indexY2,
      colors: [] as { R: number; G: number; B: number }[][],
      shouldShowPoints: true,
      detectRangePx: 3,
      detectDifferencePct: 20,
      pointsDistancePx: 10,
      colorPicker: '',
      isDetecting: false,
    }
  },
  computed: {
    circleRadiusScaledPx(): number {
      // INFO: 99をScaleで割るとMagnifierのプロットの位置がちょうど良くなる。
      // DBに格納される数値ではなくstyle用のものなので、MagicNumberだがよしと考えてる。
      const magicNumber = 99
      return magicNumber / this.scale
    },
    targetColor(): { R: number; G: number; B: number } {
      return {
        R: parseInt(this.colorPicker.slice(1, 3), 16),
        G: parseInt(this.colorPicker.slice(3, 5), 16),
        B: parseInt(this.colorPicker.slice(5, 7), 16),
      }
    },
  },
  mounted() {
    const element: HTMLCanvasElement | null = document.querySelector('#graph')
    if (element === null) {
      window.alert('element is null')
      return
    }
    const ctx = element.getContext('2d')
    const image = new Image()
    image.src = this.uploadImageUrl
    image.onload = () => {
      const widthPx = image.width
      const heightPx = image.height
      element.setAttribute('width', String(widthPx))
      element.setAttribute('height', String(heightPx))
      ctx?.drawImage(image, 0, 0)
    }
  },
  created() {},
  methods: {
    detectPointByColor() {
      this.clearPoints()
      this.isDetecting = true
      const element: HTMLCanvasElement | null = document.querySelector('#graph')
      if (element === null) {
        window.alert('element is null')
        return
      }
      const ctx = element.getContext('2d')
      const image = new Image()
      image.src = this.uploadImageUrl
      image.onload = () => {
        const widthPx = image.width
        const heightPx = image.height
        element.setAttribute('width', String(widthPx))
        element.setAttribute('height', String(heightPx))
        ctx?.drawImage(image, 0, 0)
        const paintedArea = [] as { w: number; h: number }[]
        for (let h = 0; h < heightPx; h++) {
          for (let w = 0; w < widthPx; w++) {
            if (paintedArea.some((area) => area.w === w && area.h === h)) {
              continue
            }
            const imageData = ctx?.getImageData(
              w,
              h,
              this.detectRangePx,
              this.detectRangePx
            )
            const imageRGB = imageData?.data
            const [rList, gList, bList] = [[], [], []] as number[][]
            if (imageRGB instanceof Uint8ClampedArray) {
              for (let i = 0; i < this.detectRangePx; i++) {
                rList.push(imageRGB[i * 4])
                gList.push(imageRGB[i * 4 + 1])
                bList.push(imageRGB[i * 4 + 2])
              }
            } else {
              this.$nuxt.$loading.finish()
              throw new TypeError(
                'imageRGB is not instanceof Uint8ClampedArray'
              )
            }
            const calcAverage = (numbers: number[]): number => {
              return (
                numbers.reduce((prev, cur) => prev + cur, 0) / numbers.length
              )
            }
            const canvasColor = {
              R: calcAverage(rList),
              B: calcAverage(bList),
              G: calcAverage(gList),
            }
            if (!imageData) {
              window.alert('カラーの読み込みに失敗')
            } else {
              const colorDiffDistance = this.diffColor(
                canvasColor,
                this.targetColor
              )
              if (colorDiffDistance < this.detectDifferencePct) {
                this.points.push({
                  id: this.points.length + 1,
                  xPx: w + this.detectRangePx / 2 - circleRadiusPx,
                  yPx: h + this.detectRangePx / 2 - circleRadiusPx,
                })
                for (let i = 0; i < this.pointsDistancePx; i++) {
                  for (let j = 0; j < this.pointsDistancePx; j++) {
                    if (i + j === 0) {
                      continue
                    }
                    paintedArea.push({ w: w - i, h: h + j })
                    paintedArea.push({ w: w + i, h: h + j })
                  }
                }
              }
            }
          }
        }
        this.isDetecting = false
      }
    },
    diffColor(
      color1: { R: number; G: number; B: number },
      color2: { R: number; G: number; B: number }
    ): number {
      return diff.diff(diff.rgb_to_lab(color1), diff.rgb_to_lab(color2))
    },
    inputX1Value(input: string) {
      this.coordAxesValue[indexX1] = Number(input)
    },
    inputX2Value(input: string) {
      this.coordAxesValue[indexX2] = Number(input)
    },
    inputY1Value(input: string) {
      this.coordAxesValue[indexY1] = Number(input)
    },
    inputY2Value(input: string) {
      this.coordAxesValue[indexY2] = Number(input)
    },
    changeColor(color: string) {
      this.color = color
    },
    loadImage(file: File) {
      const fr = new FileReader()
      fr.readAsDataURL(file)
      fr.addEventListener('load', () => {
        if (typeof fr.result === 'string') {
          this.uploadImageUrl = fr.result
        } else {
          window.alert('string以外の型')
        }
      })
    },
    plot(e: MouseEvent): void {
      if (this.coordAxes.length < 4) {
        this.coordAxes.push({
          xPx: e.offsetX - circleRadiusPx,
          yPx: e.offsetY - circleRadiusPx,
        })
        return
      }
      this.points.push({
        id: this.points.length + 1,
        xPx: e.offsetX - circleRadiusPx,
        yPx: e.offsetY - circleRadiusPx,
      })
    },
    calculateValueFromPixel(x: number, y: number): { xV: number; yV: number } {
      // INFO: 点x1と点x2を通る直線が、点tと垂直に交わる点のx値を計算
      const calculateVerticalCrossPoint = (
        x1x: number,
        x1y: number,
        x2x: number,
        x2y: number,
        tx: number,
        ty: number
      ): number => {
        return (
          (x2x * x1y * (x1y - x2y - ty) +
            x1x * x2y * (x2y - x1y - ty) +
            tx * (x2x - x1x) ** 2 +
            ty * (x1x * x1y + x2x * x2y)) /
          ((x2x - x1x) ** 2 + (x2y - x1y) ** 2)
        )
      }
      const [x1x, x1y, x2x, x2y, x1v, x2v, y1x, y1y, y2x, y2y, y1v, y2v] = [
        this.coordAxes[indexX1].xPx,
        this.coordAxes[indexX1].yPx,
        this.coordAxes[indexX2].xPx,
        this.coordAxes[indexX2].yPx,
        this.coordAxesValue[indexX1],
        this.coordAxesValue[indexX2],
        this.coordAxes[indexY1].xPx,
        this.coordAxes[indexY1].yPx,
        this.coordAxes[indexY2].xPx,
        this.coordAxes[indexY2].yPx,
        this.coordAxesValue[indexY1],
        this.coordAxesValue[indexY2],
      ]
      const xPx = calculateVerticalCrossPoint(x1x, x1y, x2x, x2y, x, y)
      const yPx = calculateVerticalCrossPoint(y1x, y1y, y2x, y2y, x, y)
      const xV = ((xPx - x1x) / (x2x - x1x)) * (x2v - x1v) + x1v
      const yV = ((yPx - y1x) / (y2x - y1x)) * (y2v - y1v) + y1v
      return { xV, yV }
    },
    showAxisName(index: number): string {
      switch (index) {
        case 0:
          return 'x1'
        case 1:
          return 'x2'
        case 2:
          return 'y1'
        case 3:
          return 'y2'
        default:
          return '-'
      }
    },
    clearAxes() {
      this.coordAxes = []
    },
    clearPoints() {
      this.points = []
    },
    mouseMove(e: MouseEvent) {
      this.cursorOnGraph = {
        xPx: e.offsetX,
        yPx: e.offsetY,
      }
    },
  },
})
</script>
