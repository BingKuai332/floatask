'use strict';

const { desktopCapturer } = require('electron');
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
  if (!display?.size || ![display.size.width, display.size.height].every(value => Number.isFinite(value) && value > 0) ||
      !rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) {
    throw new Error('无效的屏幕选区');
  }
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
    // A removed/unavailable monitor must not silently capture a different one.
    if (sources.some(s => s.display_id != null && String(s.display_id))) throw new Error('选定的屏幕已不可用，请重新框选');
    const displays = require('electron').screen.getAllDisplays();
    const index = displays.findIndex((d) => d.id === display.id);
    source = index >= 0 ? sources[index] : null;
    if (!source) throw new Error('选定的屏幕已不可用，请重新框选');
  }

  let image = source.thumbnail;
  if (!image || image.isEmpty()) throw new Error('屏幕截图是空的（可能被系统保护）');

  const logical = image.getSize();
  const ratioX = logical.width / display.size.width;
  const ratioY = logical.height / display.size.height;
  const x = clamp(Math.floor(rect.x * ratioX), 0, logical.width);
  const y = clamp(Math.floor(rect.y * ratioY), 0, logical.height);
  const width = clamp(Math.ceil((rect.x + rect.width) * ratioX), 0, logical.width) - x;
  const height = clamp(Math.ceil((rect.y + rect.height) * ratioY), 0, logical.height) - y;
  if (width < 1 || height < 1) throw new Error('屏幕选区已超出边界，请重新框选');

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
  try {
      fs.writeFileSync(ocrPath, ocrImage.toPNG());

      let visionDataUrl = null;
      if (vision) {
        const edge = Math.max(cropped.width, cropped.height);
        const visionImage = edge > 1600 ? image.resize({
          width: Math.max(1, Math.round(cropped.width * 1600 / edge)), height: Math.max(1, Math.round(cropped.height * 1600 / edge)), quality: 'good'
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
  } catch (error) {
    cleanupCapture(ocrPath);
    throw error;
  }
}

function cleanupCapture(pngPath) {
  if (!pngPath) return;
  try { fs.unlinkSync(pngPath); } catch { /* already gone */ }
}

module.exports = { captureRegion, cleanupCapture };
