# Starry Digitizer

[![codecov](https://codecov.io/gh/t29mato/starry-digitizer/graph/badge.svg?token=96EJTIFL79)](https://codecov.io/gh/t29mato/starry-digitizer)
[![npm version](https://badge.fury.io/js/starry-digitizer.svg)](https://www.npmjs.com/package/starry-digitizer)

A web-based plot digitizer tool for extracting numerical data from graph images. Upload an image of a graph, calibrate the axes, and extract data points with precision.

**Live Demo:** [https://starrydigitizer.vercel.app/](https://starrydigitizer.vercel.app/)

## Features

- **Image Upload** - Load graph images (PNG, JPG, etc.) directly in the browser
- **Axis Calibration** - Set X and Y axis reference points with support for:
  - Linear and logarithmic scales
  - 2-point or 4-point calibration modes
  - Graph tilt correction
- **Multiple Datasets** - Manage multiple datasets with color coding
- **Data Point Extraction**
  - Manual point-by-point clicking
  - Automatic extraction using color detection
  - Line interpolation between points
- **Magnifier** - Zoom in on cursor position for precise point placement
- **Export Options**
  - Copy data to clipboard as CSV
  - Export/Import projects as ZIP files
- **View All Datasets** - Overlay all datasets on the graph simultaneously

## Quick Start

### Online Usage

Visit [https://starrydigitizer.vercel.app/](https://starrydigitizer.vercel.app/) to use the tool directly in your browser.

### NPM Package

Install the package to embed in your own application:

```bash
npm install starry-digitizer
```

```javascript
import StarryDigitizer from 'starry-digitizer'
import 'starry-digitizer/styles'
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/t29mato/starry-digitizer.git
cd starry-digitizer

# Install dependencies
yarn install

# Start development server
yarn dev
```

The development server runs at `http://localhost:8888`

## Usage Guide

### Basic Workflow

1. **Upload an Image** - Click "Upload Image" and select a graph image
2. **Set Axis Points** - Click on the graph to define X1, X2, Y1, Y2 calibration points
3. **Enter Axis Values** - Input the corresponding numerical values for each axis point
4. **Extract Data** - Click on data points or use automatic extraction
5. **Export** - Copy data to clipboard or save the project

### Keyboard Shortcuts

- **Arrow Keys** - Fine-tune selected axis/point position
- **Delete** - Remove selected point

## Development

### Tech Stack

- Vue 3 + TypeScript
- Vite
- Vuetify 3
- OpenCV.js (for image processing)

### Scripts

```bash
yarn dev              # Start development server
yarn test             # Run unit tests
yarn test:coverage    # Run tests with coverage
yarn lint             # Run ESLint and type checking
yarn app-prod-build   # Build for production
yarn lib-build        # Build as library
```

### Testing

```bash
# Unit tests (Jest)
yarn test

# E2E tests (Cypress)
yarn cypress:open
```

## Project Background

Starry Digitizer was originally developed as part of the [Starrydata project](https://starrydata.org/), an open database for inorganic materials science experimental data. The tool was created to streamline the process of extracting graph data while preserving axis information and graph images.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License
