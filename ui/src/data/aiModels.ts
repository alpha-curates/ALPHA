export interface ProviderDef {
  url: string
  models: string[]
  default_model?: string
  api_key?: string
  requires_key?: boolean
}

export interface VirtualProviderDef {
  id: string
  name: string
  type: string
  api_url: string
  api_key: string
  default_model: string
  models: string[]
}

export const OPENCODE_MODELS: string[] = [
  'big-pickle', 'deepseek-v4-flash-free', 'mimo-v2.5-free',
  'qwen3.6-plus-free', 'minimax-m3-free', 'nemotron-3-ultra-free',
  'north-mini-code-free', 'qwq-plus-free', 'qwen-max-free',
  'gemini-2.5-flash-free', 'gpt-4o-mini-free', 'claude-sonnet-free',
  'llama-4-scout-free', 'mistral-large-free', 'deepseek-r1-free',
]

export const KEYLESSAI_MODELS: string[] = [
  'openai-fast', 'step-3.5-flash:free', 'gemma3-270m:free',
  'gpt-5-nano', 'gpt-4o-mini', 'gpt-3.5-turbo',
  'gpt-4o', 'gpt-4-turbo', 'claude-3-opus',
  'claude-3-sonnet', 'gemini-1.5-pro', 'gemini-1.5-flash',
  'llama-3.1-405b', 'llama-3.1-70b', 'mixtral-8x22b',
  'deepseek-v3', 'qwen-2.5-72b', 'mistral-large',
]

export const GROQ_MODELS: string[] = [
  'llama-3.3-70b-versatile', 'llama-3.1-8b-instant',
  'mixtral-8x7b-32768', 'gemma2-9b-it',
  'deepseek-r1-distill-llama-70b',
  'llama-4-maverick-17b-128e-instruct',
  'llama-4-scout-17b-16e-instruct',
  'llama-guard-4-12b',
  'qwen/qwen3-32b', 'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b', 'openai/gpt-oss-20b',
  'llama3-70b-8192', 'llama3-8b-8192',
  'gemma-7b-it', 'llama-guard-3-8b',
  'llama3-groq-70b-8192-tool-use-preview',
  'llama3-groq-8b-8192-tool-use-preview',
  'whisper-large-v3', 'whisper-large-v3-turbo',
  'distil-whisper-large-v3-en',
]

export const HUGGINGFACE_MODELS: string[] = [
  'meta-llama/Llama-3.2-3B-Instruct',
  'meta-llama/Llama-3.2-1B-Instruct',
  'meta-llama/Llama-3.1-8B-Instruct',
  'meta-llama/Llama-3.1-70B-Instruct',
  'meta-llama/Llama-3.1-405B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3',
  'mistralai/Mixtral-8x7B-Instruct-v0.1',
  'mistralai/Mixtral-8x22B-Instruct-v0.1',
  'HuggingFaceH4/zephyr-7b-beta',
  'google/gemma-2-9b-it', 'google/gemma-2-2b-it',
  'google/gemma-3-12b-it', 'google/gemma-3-27b-it',
  'microsoft/Phi-3-mini-4k-instruct',
  'microsoft/Phi-3-medium-4k-instruct',
  'microsoft/Phi-3.5-mini-instruct',
  'Qwen/Qwen2.5-7B-Instruct', 'Qwen/Qwen2.5-72B-Instruct',
  'Qwen/Qwen2.5-32B-Instruct', 'Qwen/Qwen3-30B-Instruct',
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
  'deepseek-ai/DeepSeek-V3-0324',
  'tiiuae/falcon-7b-instruct', 'tiiuae/falcon-40b-instruct',
  'codellama/CodeLlama-7b-Instruct-hf',
  'codellama/CodeLlama-34b-Instruct-hf',
  'stabilityai/stablelm-zephyr-3b',
  'openchat/openchat-3.5-0106',
  'upstage/SOLAR-10.7B-Instruct-v1.0',
  '01-ai/Yi-34B-Chat', '01-ai/Yi-1.5-9B-Chat',
  'CohereForAI/command-r-v01', 'CohereForAI/command-r-plus',
  'NousResearch/Hermes-3-Llama-3.1-70B',
  'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
  'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF',
  'alpindale/gemma-2-27b-it',
  'jondurbin/bagel-8b-v1.1',
  'sophosympatheia/Rogue-Rose-103b-v0.2',
  'teknium/OpenHermes-2.5-Mistral-7B',
]

export const CLOUDFLARE_MODELS: string[] = [
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/meta/llama-3.2-1b-instruct',
  '@cf/meta/llama-3.2-11b-vision-instruct',
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/meta/llama-3.1-70b-instruct',
  '@cf/meta/llama-3-8b-instruct',
  '@cf/mistral/mistral-7b-instruct-v0.1',
  '@cf/mistral/mixtral-8x7b-instruct',
  '@cf/google/gemma-2-9b-it',
  '@cf/google/gemma-7b-it', '@cf/google/gemma-2b-it',
  '@cf/google/gemma-3-12b-it', '@cf/google/gemma-3-27b-it',
  '@cf/microsoft/phi-3-mini-4k-instruct',
  '@cf/microsoft/phi-2',
  '@cf/qwen/qwen2.5-7b-instruct',
  '@cf/qwen/qwen2.5-14b-instruct',
  '@cf/qwen/qwen2.5-32b-instruct',
  '@cf/qwen/qwen2.5-72b-instruct',
  '@cf/qwen/qwen1.5-7b-chat-awq',
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  '@cf/tiiuae/falcon-7b-instruct',
  '@cf/tiiuae/falcon-40b-instruct',
  '@cf/stabilityai/stablelm-zephyr-3b',
  '@cf/defog/sqlcoder-7b-2',
  '@cf/openchat/openchat-3.5-0106',
  '@cf/meta/llama-2-7b-chat-int8',
  '@cf/meta/llama-2-13b-chat-int8',
  '@cf/mistral/mistral-7b-instruct-v0.2-lora',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/openai/gpt-oss-120b',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
  '@hf/thebloke/mistral-7b-instruct-v0.1-gguf',
  '@hf/thebloke/llama-2-7b-chat-gguf',
  '@hf/thebloke/llama-2-13b-chat-gguf',
  '@hf/thebloke/codellama-7b-instruct-gguf',
  '@cf/meta/llama-3.3-70b-instruct-fp8',
]

export const OPENAI_MODELS: string[] = [
  'gpt-4o', 'gpt-4o-mini', 'gpt-4o-audio-preview',
  'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-4',
  'gpt-3.5-turbo', 'gpt-3.5-turbo-0125',
  'o1-preview', 'o1-mini', 'o3-mini',
  'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'chatgpt-4o-latest',
  'gpt-4.5-preview', 'gpt-4.5-turbo',
  'o4-mini', 'o4-preview',
  'gpt-5', 'gpt-5-mini',
  'gpt-4o-realtime-preview',
  'gpt-4o-mini-realtime-preview',
  'gpt-4.1-2025-05-12', 'gpt-4.1-mini-2025-05-12', 'gpt-4.1-nano-2025-05-12',
]

export const GEMINI_MODELS: string[] = [
  'gemini-2.5-pro-exp-03-25', 'gemini-2.5-flash-preview-04-17',
  'gemini-2.0-flash', 'gemini-2.0-flash-lite',
  'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b',
  'gemini-1.0-pro',
  'gemini-2.0-flash-exp', 'gemini-2.0-flash-thinking-exp-01-21',
  'gemini-2.5-pro-05-06', 'gemini-2.5-flash-05-06',
  'gemini-2.0-flash-001', 'gemini-2.0-flash-lite-001',
  'gemini-1.5-flash-8b-exp-0827',
  'gemini-exp-1206', 'gemini-2.0-flash-thinking-exp',
]

export const CLAUDE_MODELS: string[] = [
  'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229', 'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-4-opus', 'claude-4-sonnet',
  'claude-3-5-sonnet-v2', 'claude-3-5-haiku-v2',
  'claude-4-opus-20250522', 'claude-4-sonnet-20250522',
  'claude-3-opus-latest', 'claude-3-haiku-latest',
]

export const TOGETHER_MODELS: string[] = [
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'meta-llama/Llama-3.1-8B-Instruct-Turbo',
  'meta-llama/Llama-3.1-405B-Instruct-Turbo',
  'mistralai/Mixtral-8x22B-Instruct-v0.1',
  'mistralai/Mistral-7B-Instruct-v0.3',
  'google/gemma-2-27b-it',
  'Qwen/Qwen2.5-72B-Instruct-Turbo',
  'Qwen/Qwen2.5-7B-Instruct-Turbo',
  'deepseek-ai/DeepSeek-R1',
  'deepseek-ai/DeepSeek-V3',
  'upstage/SOLAR-10.7B-Instruct-v1.0',
  'togethercomputer/llama-2-70b-chat',
  'codellama/CodeLlama-34b-Instruct-hf',
  'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
  'Gryphe/MythoMax-L2-13b',
]

export const DEEPSEEK_MODELS: string[] = [
  'deepseek-chat', 'deepseek-coder',
  'deepseek-reasoner', 'deepseek-r1',
  'deepseek-v3', 'deepseek-v3-0324',
  'deepseek-coder-v2', 'deepseek-coder-v2-instruct',
  'deepseek-r1-distill-qwen-32b',
  'deepseek-r1-distill-qwen-14b',
  'deepseek-r1-distill-llama-70b',
  'deepseek-r1-distill-llama-8b',
  'deepseek-r1-distill-qwen-1.5b',
]

export const MISTRAL_MODELS: string[] = [
  'mistral-large-latest', 'mistral-small-latest',
  'codestral-latest', 'codestral-2505',
  'mistral-7b-instruct-v03', 'mixtral-8x7b-instruct-v0.1',
  'mixtral-8x22b-instruct-v0.1',
  'ministral-8b-latest', 'ministral-3b-latest',
  'mistral-3.1-large', 'mistral-3.1-small',
  'open-mistral-7b', 'open-mixtral-8x7b',
  'open-mixtral-8x22b',
]

export const COHERE_MODELS: string[] = [
  'command-r-plus', 'command-r', 'command-r7b',
  'command', 'command-light',
  'command-r-08-2024', 'command-r-plus-08-2024',
  'command-r7b-12-2024',
  'c4ai-aya-expanse-32b', 'c4ai-aya-expanse-8b',
]

export const GROK_MODELS: string[] = [
  'grok-2-1212', 'grok-2-mini',
  'grok-beta', 'grok-2-vision',
  'grok-2-latest', 'grok-2-mini-latest',
]

export const PERPLEXITY_MODELS: string[] = [
  'sonar-pro', 'sonar-reasoning-pro',
  'sonar-reasoning', 'sonar-deep-research',
  'llama-3.1-sonar-huge-128k',
  'llama-3.1-sonar-large-128k',
  'llama-3.1-sonar-small-128k',
]

export const PROVIDER_DEFAULTS: Record<string, ProviderDef> = {
  openai: { url: 'https://api.openai.com', models: OPENAI_MODELS, requires_key: true },
  gemini: { url: '', models: GEMINI_MODELS, requires_key: true },
  claude: { url: '', models: CLAUDE_MODELS, requires_key: true },
  groq: { url: 'https://api.groq.com/openai/v1', models: GROQ_MODELS, default_model: 'llama-3.3-70b-versatile', requires_key: true },
  huggingface: { url: 'https://api-inference.huggingface.co/v1', models: HUGGINGFACE_MODELS, default_model: 'meta-llama/Llama-3.2-3B-Instruct', requires_key: true },
  cloudflare: { url: '', models: CLOUDFLARE_MODELS, default_model: '@cf/meta/llama-3.2-3b-instruct', requires_key: true },
  opencode: { url: 'https://opencode.ai/zen', models: OPENCODE_MODELS, default_model: 'big-pickle', requires_key: false },
  ollama: { url: 'http://localhost:11434', models: [], requires_key: false },
  together: { url: 'https://api.together.xyz/v1', models: TOGETHER_MODELS, requires_key: true },
  deepseek: { url: 'https://api.deepseek.com', models: DEEPSEEK_MODELS, requires_key: true },
  mistral: { url: 'https://api.mistral.ai/v1', models: MISTRAL_MODELS, requires_key: true },
  cohere: { url: 'https://api.cohere.com/v2', models: COHERE_MODELS, requires_key: true },
  grok: { url: '', models: GROK_MODELS, requires_key: true },
  perplexity: { url: 'https://api.perplexity.ai', models: PERPLEXITY_MODELS, requires_key: true },
}

export const VIRTUAL_PROVIDERS: VirtualProviderDef[] = [
  {
    id: '__opencode__', name: 'OpenCode Zen', type: 'openai',
    api_url: 'https://opencode.ai/zen', api_key: '',
    default_model: 'big-pickle',
    models: OPENCODE_MODELS,
  },
  {
    id: '__keylessai__', name: 'KeylessAI (free)', type: 'openai',
    api_url: 'https://keylessai.thryx.workers.dev/v1', api_key: 'not-needed',
    default_model: 'openai-fast',
    models: KEYLESSAI_MODELS,
  },
]

export const PROVIDER_TYPES: string[] = [
  'ollama', 'openai', 'gemini', 'claude', 'opencode',
  'groq', 'huggingface', 'cloudflare',
  'together', 'deepseek', 'mistral', 'cohere', 'grok', 'perplexity',
]
