'use strict';

const { desktopCapturer, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./powershell');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Capture a region of a display without any of our own windows.
 * @param {Electron.Display} display
 * @param {{x:number,y:number,width:number,height:number}} rect DIP coordinates relative to the display
 */
async function captureRegion(display, rect, { vision = false } = {}) {
  const scale = display.scaleFactor || 1;
  const thumbWidth = Math.max(1, Math.round(display.size.width * scale));
  const thumbHeight = Math.max(1, Math.round(display.size.height * scale));

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: thumbWidth, height: thumbHeight },
    fetchWindowIcons: false
  });
  if (!sources.length) throw new Error('无法读取屏幕画面');

  let source = sources.find((s) => String(s.display_id) === String(display.id));
  if (!source) {
    const displays = require('electron').screen.getAllDisplays();
    const index = displays.findIndex((d) => d.id === display.id);
    source = sources[index] || sources[0];
  }

  let image = source.thumbnail;
  if (!image || image.isEmpty()) throw new Error('屏幕截图是空的（可能被系统保护）');

  const logical = image.getSize();
  const ratioX = logical.width / display.size.width;
  const ratioY = logical.height / display.size.height;
  const x = clamp(Math.round(rect.x * ratioX), 0, Math.max(0, logical.width - 2));
  const y = clamp(Math.round(rect.y * ratioY), 0, Math.max(0, logical.height - 2));
  const width = clamp(Math.round(rect.width * ratioX), 2, logical.width - x);
  const height = clamp(Math.round(rect.height * ratioY), 2, logical.height - y);

  image = image.crop({ x, y, width, height });
  if (!image || image.isEmpty()) throw new Error('裁剪选区失败');

  const cropped = image.getSize();
  const dir = tempDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // OCR does better with more pixels; keep the original for the preview.
  let ocrImage = image;
  if (cropped.width < 1200) {
    const factor = cropped.width < 600 ? 2.4 : 1.8;
    ocrImage = image.resize({
      width: Math.min(2600, Math.round(cropped.width * factor)),
      quality: 'best'
    });
  }
  const ocrPath = path.join(dir, `capture-${id}.png`);
  fs.writeFileSync(ocrPath, ocrImage.toPNG());

  let visionDataUrl = null;
  if (vision) {
    const edge = Math.max(cropped.width, cropped.height);
    const visionImage = edge > 1600 ? image.resize({
      width: Math.round(cropped.width * 1600 / edge), height: Math.round(cropped.height * 1600 / edge), quality: 'good'
    }) : image;
    visionDataUrl = 'data:image/jpeg;base64,' + visionImage.toJPEG(82).toString('base64');
  }

  const preview = image.resize({ width: Math.min(420, cropped.width), quality: 'good' });
  const previewDataUrl = preview.toDataURL();

  return {
    pngPath: ocrPath,
    width: cropped.width,
    height: cropped.height,
    previewDataUrl,
    visionDataUrl
  };
}

function cleanupCapture(pngPath) {
  if (!pngPath) return;
  try { fs.unlinkSync(pngPath); } catch { /* already gone */ }
}

module.exports = { captureRegion, cleanupCapture };
