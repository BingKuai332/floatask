'use strict';
// Builds the user-copyable diagnostics string. The output is deliberately
// small and whitelisted: version, OS, DPI/display configuration and a
// sanitized update error code. It must never carry keys, OCR text,
// screenshots or conversation content.

const ERROR_CODE = /^update\.[a-zA-Z.]{2,40}$/;

function sanitizeErrorCode(value) {
  return typeof value === 'string' && ERROR_CODE.test(value) ? value : '';
}

/**
 * @param {{version:string, platform:string, osRelease:string,
 *          displays:Array<{width:number,height:number,scaleFactor:number,workArea:{width:number,height:number}}>,
 *          lastUpdateError?:string}} info
 * @returns {string} single-line-per-section diagnostics text
 */
function buildDiagnostics(info) {
  const lines = [
    `FloatAsk ${info.version}`,
    `OS: ${info.platform} ${info.osRelease}`,
    `Displays: ${(info.displays || []).length}`
  ];
  for (const display of info.displays || []) {
    lines.push(`- ${display.width}x${display.height} @ ${display.scaleFactor}x, workArea ${display.workArea.width}x${display.workArea.height}`);
  }
  const error = sanitizeErrorCode(info.lastUpdateError);
  if (error) lines.push(`Last update error: ${error}`);
  return lines.join('\n');
}

module.exports = { buildDiagnostics, sanitizeErrorCode };
