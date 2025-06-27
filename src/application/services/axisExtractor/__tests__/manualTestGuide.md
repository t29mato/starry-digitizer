# Manual Testing Guide for Axis Extraction with Real Images

## 🎯 Test Images Available

Located in `src/assets/test/`:
1. **cycleNumber_capacity.png** - Battery cycle vs capacity chart
2. **temperature_seebeckCoefficient.png** - Temperature vs Seebeck coefficient chart  
3. **temperature_zt.png** - Temperature vs ZT coefficient chart

## 🧪 Manual Test Steps

### Test 1: cycleNumber_capacity.png
1. Open starry-digitizer in browser
2. Load `src/assets/test/cycleNumber_capacity.png`
3. Click the axis extraction button (blue button with axis icon)
4. **Expected Results:**
   - X-axis: Cycle numbers (likely 0-1000 or similar range)
   - Y-axis: Capacity values (likely 0-200 mAh/g or similar)
   - Red frames should highlight tick label regions
   - Confirmation dialog should show extracted values

### Test 2: temperature_seebeckCoefficient.png  
1. Load `src/assets/test/temperature_seebeckCoefficient.png`
2. Click axis extraction button
3. **Expected Results:**
   - X-axis: Temperature values (likely 300-800K or °C)
   - Y-axis: Seebeck coefficient (likely negative to positive μV/K)
   - Should detect both positive and negative Y values

### Test 3: temperature_zt.png
1. Load `src/assets/test/temperature_zt.png`  
2. Click axis extraction button
3. **Expected Results:**
   - X-axis: Temperature values (likely 300-800K)
   - Y-axis: ZT values (likely 0-2.0 range)
   - Should detect positive values for both axes

## ✅ Validation Checklist

For each test image, verify:

### Visual Detection
- [ ] Red frames appear around tick label regions
- [ ] X-axis frame is below the horizontal axis line
- [ ] Y-axis frame is left of the vertical axis line
- [ ] Frames are appropriately sized and positioned

### Extracted Values
- [ ] X1 < X2 (ascending order)
- [ ] Y1 < Y2 (ascending order) 
- [ ] Values are reasonable for the chart type
- [ ] Raw OCR text shows detected characters
- [ ] Parsed numbers match visible tick labels

### User Experience
- [ ] Loading state shows during processing
- [ ] Confirmation dialog appears with preview
- [ ] "Yes, Import Values" updates axis settings immediately
- [ ] "No, Cancel" dismisses dialog without changes
- [ ] No success popup appears (removed as requested)

### Error Handling
- [ ] Graceful handling if no axes detected
- [ ] Clear error message for network issues (OpenCV.js loading)
- [ ] Fallback behavior for OCR failures

## 🐛 Common Issues to Test

1. **Poor Image Quality**
   - Try with blurry or low-resolution images
   - Verify graceful degradation

2. **Complex Charts**
   - Charts with multiple Y-axes
   - Charts with logarithmic scales
   - Charts with rotated text

3. **Edge Cases**
   - Very small tick labels
   - Overlapping text
   - Non-standard axis positions

## 📊 Expected Performance

- **Processing Time**: 5-15 seconds per image
- **Accuracy**: Should detect major tick values correctly
- **Robustness**: Should handle common chart variations

## 🔧 Debug Information

When testing, check browser console for:
- OpenCV.js loading status
- Tesseract.js processing logs  
- Any error messages or warnings
- Extracted region coordinates
- OCR text recognition results

## 🎯 Success Criteria

A successful test should:
1. ✅ Load the image without errors
2. ✅ Detect horizontal and vertical axis lines
3. ✅ Extract meaningful numerical values from tick labels
4. ✅ Present clear visual feedback to user
5. ✅ Update axis settings accurately when confirmed
6. ✅ Provide appropriate error messages when needed

---

**Note**: Automated tests validate the pipeline and file loading, but real extraction testing requires a browser environment with actual OpenCV.js and Tesseract.js libraries loaded.