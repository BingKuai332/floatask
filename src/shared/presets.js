'use strict';

/**
 * OpenAI-compatible provider presets.
 * Keep this dependency-free: it is required by the main process only.
 */
const PRESETS = {
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    vision: false,
    keyUrl: 'https://platform.deepseek.com/api_keys',
    note: '文本模型，速度快、中文好。图表/图片内容请开启视觉模型或手动输入。'
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    vision: true,
    keyUrl: 'https://platform.openai.com/api-keys',
    note: '支持截图理解，适合图表、界面和图片。'
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.5-flash',
    vision: true,
    keyUrl: 'https://openrouter.ai/keys',
    note: '一个 Key 可切换多家模型，模型名填写 OpenRouter 的完整名称。'
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    vision: true,
    keyUrl: 'https://aistudio.google.com/apikey',
    note: '使用 Gemini 的 OpenAI 兼容接口，支持截图。'
  },
  ollama: {
    id: 'ollama',
    label: '本地 Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5vl:7b',
    vision: true,
    keyUrl: 'https://ollama.com',
    note: '数据不出本机。需先安装 Ollama 并拉取模型，API Key 可留空。'
  },
  custom: {
    id: 'custom',
    label: '自定义 / 其他',
    baseUrl: '',
    model: '',
    vision: false,
    keyUrl: '',
    note: '任何兼容 /chat/completions 的服务都可以接入。'
  }
};

module.exports = { PRESETS };
