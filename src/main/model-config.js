'use strict';
const TASKS = ['initial', 'followup', 'vision'];
function resolveModel(config, task, hasImage = false) {
  const profile = config.modelProfiles?.[task];
  function resolveProfile(p) {
    const result = { ...config };
    if (!p?.enabled) return result;
    result.model = p.model || result.model;
    result.temperature = p.temperature ?? result.temperature;
    result.maxTokens = p.maxTokens ?? result.maxTokens;
    result.vision = p.vision ?? config.vision;
    if (p.customService) {
      result.provider = p.provider || 'custom';
      result.baseUrl = p.baseUrl || '';
      result.apiKey = p.apiKey || '';
    }
    return result;
  }
  let result = resolveProfile(profile);
  const wantsImage = Boolean(hasImage && config.vision && result.vision);
  // Screenshot overrides are their own task, so "default service" means the
  // global service rather than an initial/follow-up task's separate endpoint.
  if (wantsImage && config.modelProfiles?.vision?.enabled) result = resolveProfile(config.modelProfiles.vision);
  result.vision = wantsImage;
  return result;
}
module.exports = { TASKS, resolveModel };
