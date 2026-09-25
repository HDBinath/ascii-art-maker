# 🌌 CYBER::STUDIO — Neural ASCII & Dithered Pixel Art Studio

A fast, interactive cyberpunk **ASCII Art & Retro Dithered Pixel Art Studio** built with **Next.js 16 (App Router)**, **React**, **TypeScript**, **HTML5 Canvas**, and **Web Audio API**.

---

## ✨ Features

### 1. 🔠 ASCII Art Studio
- **Curated Character Sets**:
  - *Simple* (` .:-=+*#%@`)
  - *Cyberpunk* (` .^!*<&%$#@`)
  - *Blocks / Shading* (` ░▒▓█`)
  - *Binary* (` 01`)
  - *Detailed* (70-character full ramp)
  - *Braille / Dots* (` ⠁⠃⠇⠧⠷⠿`)
  - *Matrix Hex* (` 0123456789ABCDEF$#@`)
  - *Custom* user-defined ramp
- **ASCII Color Themes**:
  - **Matrix Phosphor** (`#00ff41`)
  - **Retro Amber CRT** (`#ffb000`)
  - **Synthwave Neon** (Pink & Cyan gradient)
  - **RGB Full Color** (Per-character pixel sampling)
  - **Monochrome B&W**
- **Precision Adjustments**: Columns / Resolution (30 to 240), Font Size (6px to 24px), Aspect Ratio (0.35 to 0.75), Invert Luminance.

---

### 2. 👾 Retro Dithered Pixel Art Studio
- **Advanced Dithering Algorithms**:
  - **Floyd-Steinberg** (Classic error diffusion)
  - **Atkinson** (Crisp Macintosh HyperCard style)
  - **Bayer 4×4 & Bayer 8×8** (Ordered crosshatch matrix dithering)
  - **Sierra Lite & Burkes** (Smooth multi-directional diffusion)
  - **Halftone Dots** (Comic book / newspaper dot simulation)
  - **Blue Noise** & **Threshold Cut**
- **Iconic Retro Color Palettes**:
  - **Game Boy Classic** (4-shade green)
  - **Cyberpunk Neon** (Cyan, Magenta, Yellow, Purple)
  - **CGA Mode 1** (Black, Cyan, Magenta, White)
  - **Pico-8** (16 fantasy console colors)
  - **Commodore 64** (16 colors)
  - **1-Bit Macintosh** (Crisp Black & White)
  - **Amber Phosphor CRT**
  - **Synthwave Sunset**
  - **Sepia Antique**
  - **Solarized Dark**
- **Pixel Controls**: Pixel Scale / Downsampling (1px to 24px block size) and Dither Intensity (0% to 150%).

---

### 3. 🔮 Hybrid Dither-ASCII Mode
- Applies error diffusion across the character density ramp for ultra-smooth character transitions without harsh banding.

---

### 4. 🎛️ Interactive Controls & Utilities
- **Dual Input Stream**: Drag & Drop / File Upload + Live Webcam streaming with mirror flip.
- **Split-Screen Comparison**: Interactive draggable split slider to compare original vs converted art side-by-side.
- **CRT Shader FX**: Realistic retro CRT scanline overlay and screen bloom glow with 1-click toggle.
- **Web Audio SFX**: Tactile retro terminal sound effects (clicks, scans, laser chimes).
- **Multi-Format Exports**:
  - 🖼️ **Download High-Res PNG** (Crisp canvas snapshot)
  - 📄 **Save .TXT** (Plain text ASCII file)
  - 🌐 **Export .HTML** (Standalone styled glowing webpage)
  - 📋 **Copy Text to Clipboard** (Instant 1-click copy with toast notification)

---

## 🚀 Quick Start (Local Run)

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Free Cloud Hosting (1-Click Deployment)

### Deploy to Vercel (Recommended — Free)
1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com) and import your repository.
3. Click **Deploy** — it will build and deploy your Next.js app automatically!

### Deploy to Render / Netlify / Cloudflare Pages
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (or standard Next.js preset)
