'use strict';
const TASKS = ['initial', 'followup', 'vision'];
function resolveModel(config, task, hasImage = false) {
  const profile = config.modelProfiles?.[task];
  let result = { ...config };
  function apply(p) {
    if (!p?.enabled) return;
    result.model = p.model || result.model;
    result.temperature = p.temperature ?? result.temperature;
    result.maxTokens = p.maxTokens ?? result.maxTokens;
    result.vision = p.vision;
    if (p.customService) {
      result.provider = p.provider || 'custom';
      result.baseUrl = p.baseUrl || '';
      result.apiKey = p.apiKey || '';
    }
  }
  apply(profile);
  const wantsImage = Boolean(hasImage && config.vision && result.vision);
  if (wantsImage) apply(config.modelProfiles?.vision);
  result.vision = wantsImage;
  return result;
}
module.exports = { TASKS, resolveModel };
