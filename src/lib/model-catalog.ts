import type {
  AutoTuneOverrides,
  Model,
  ModelOptimizationGoal,
  ModelTaskIntent,
  Provider,
  ProviderType,
  RecommendedModelParameters,
} from '@/types';

interface ProviderPreset {
  label: string;
  baseUrl: string;
  description: string;
  strengths: string[];
  setupHint: string;
}

interface AutoTuneOptions {
  optimizationGoal?: ModelOptimizationGoal;
  taskIntent?: ModelTaskIntent;
  overrides?: AutoTuneOverrides;
}

const FALLBACK_RECOMMENDATION: RecommendedModelParameters = {
  temperature: 0.4,
  maxTokens: 4096,
  note: 'Balanced defaults for general document chat.',
};

export const PROVIDER_PRESETS: Record<ProviderType, ProviderPreset> = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    description: 'Frontier GPT models for high-quality reasoning, coding, and agent-style workflows.',
    strengths: ['Reasoning', 'Coding', 'Structured outputs'],
    setupHint: 'Best when you want strong all-round performance and broad model availability.',
  },
  claude: {
    label: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    description: 'Anthropic Claude models optimized for long-form writing, analysis, and careful instruction following.',
    strengths: ['Writing', 'Analysis', 'Long context'],
    setupHint: 'Great for nuanced drafting, review, and polished document transformations.',
  },
  gemini: {
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    description: 'Google Gemini models for multimodal work, speed tiers, and large-context assistance.',
    strengths: ['Multimodal', 'Speed', 'Large context'],
    setupHint: 'Useful when you need fast responses or multimodal-friendly model families.',
  },
  ollama: {
    label: 'Ollama',
    baseUrl: 'http://localhost:11434',
    description: 'Run local models through Ollama for private, offline, or lower-cost experimentation.',
    strengths: ['Local inference', 'Privacy', 'Custom open models'],
    setupHint: 'Ideal for local deployments where latency and privacy matter more than frontier quality.',
  },
  nvidia: {
    label: 'NVIDIA',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    description: 'Hosted access to NVIDIA-curated open models for inference and experimentation.',
    strengths: ['Open models', 'Hosted inference', 'Flexible stacks'],
    setupHint: 'A good option when you want managed access to open-weight model families.',
  },
};

function normalizeId(value: string): string {
  return value.toLowerCase();
}

function createRecommendation(
  temperature: number,
  maxTokens: number,
  note: string
): RecommendedModelParameters {
  return { temperature, maxTokens, note };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const GOAL_ADJUSTMENTS: Record<ModelOptimizationGoal, { temperatureDelta: number; maxTokensFactor: number; label: string }> = {
  speed: {
    temperatureDelta: 0.05,
    maxTokensFactor: 0.72,
    label: 'Speed-optimized',
  },
  balanced: {
    temperatureDelta: 0,
    maxTokensFactor: 1,
    label: 'Balanced',
  },
  quality: {
    temperatureDelta: -0.08,
    maxTokensFactor: 1.2,
    label: 'Quality-optimized',
  },
};

const TASK_ADJUSTMENTS: Record<ModelTaskIntent, { temperatureDelta: number; maxTokensFactor: number; label: string }> = {
  general: {
    temperatureDelta: 0,
    maxTokensFactor: 1,
    label: 'General',
  },
  analysis: {
    temperatureDelta: -0.07,
    maxTokensFactor: 1.18,
    label: 'Analysis',
  },
  writing: {
    temperatureDelta: 0.08,
    maxTokensFactor: 1.1,
    label: 'Writing',
  },
  coding: {
    temperatureDelta: -0.05,
    maxTokensFactor: 1.16,
    label: 'Coding',
  },
};

function getModelLimitations(
  providerType: ProviderType,
  profile: Model['profile']
): string[] {
  const providerLimitations: Record<ProviderType, string> = {
    openai: 'Latency and cost can rise on deeper tiers.',
    claude: 'Rate limits can be strict on high-context workloads.',
    gemini: 'Output style may vary more between model tiers.',
    ollama: 'Quality and speed depend on local hardware and model size.',
    nvidia: 'Model availability and limits vary by endpoint.',
  };

  const profileLimitations: Record<NonNullable<Model['profile']>, string> = {
    Fast: 'May miss nuance on long multi-step tasks.',
    Balanced: 'Generalists can underperform specialized deep models.',
    Deep: 'Usually slower and more expensive for routine prompts.',
  };

  return [
    profile ? profileLimitations[profile] : 'Performance can vary by prompt complexity.',
    providerLimitations[providerType],
  ];
}

function applyAutoTuneStrategy(
  recommendation: RecommendedModelParameters,
  optimizationGoal: ModelOptimizationGoal,
  taskIntent: ModelTaskIntent
): RecommendedModelParameters {
  const goal = GOAL_ADJUSTMENTS[optimizationGoal];
  const task = TASK_ADJUSTMENTS[taskIntent];

  const temperature = clamp(
    recommendation.temperature + goal.temperatureDelta + task.temperatureDelta,
    0,
    2
  );
  const maxTokens = Math.max(
    256,
    Math.round(recommendation.maxTokens * goal.maxTokensFactor * task.maxTokensFactor)
  );

  return {
    temperature,
    maxTokens,
    note: `${recommendation.note} ${goal.label} · ${task.label}.`,
  };
}

function applyManualOverrides(
  parameters: RecommendedModelParameters,
  overrides?: AutoTuneOverrides
): RecommendedModelParameters {
  if (!overrides) return parameters;

  const hasTemperatureOverride = typeof overrides.temperature === 'number';
  const hasMaxTokensOverride = typeof overrides.maxTokens === 'number';

  if (!hasTemperatureOverride && !hasMaxTokensOverride) {
    return parameters;
  }

  return {
    temperature: hasTemperatureOverride ? clamp(overrides.temperature as number, 0, 2) : parameters.temperature,
    maxTokens: hasMaxTokensOverride
      ? Math.max(256, Math.round(overrides.maxTokens as number))
      : parameters.maxTokens,
    note: `${parameters.note} Manual overrides applied.`,
  };
}

function getOpenAIMetadata(modelId: string) {
  const normalized = normalizeId(modelId);

  if (normalized.includes('gpt-5') && normalized.includes('mini')) {
    return {
      family: 'GPT-5',
      description: 'Fast GPT-5 variant for everyday drafting, light coding, and quick agent iterations.',
      profile: 'Fast' as const,
      contextWindow: 'Large',
      capabilities: ['Low latency', 'Coding', 'General chat', 'Tool orchestration'],
      bestFor: ['Fast follow-ups', 'Everyday productivity', 'Lower-cost assistance'],
      recommendedParameters: createRecommendation(
        0.3,
        8000,
        'Keeps outputs concise and reliable while preserving speed.'
      ),
    };
  }

  if (normalized.includes('gpt-5')) {
    return {
      family: 'GPT-5',
      description: 'High-end reasoning and coding model for demanding agent tasks and complex requests.',
      profile: 'Deep' as const,
      contextWindow: 'Large',
      capabilities: ['Deep reasoning', 'Coding', 'Planning', 'Tool orchestration'],
      bestFor: ['Complex workflows', 'Precise editing', 'Multi-step tasks'],
      recommendedParameters: createRecommendation(
        0.2,
        12000,
        'Lower temperature improves consistency for long reasoning chains.'
      ),
    };
  }

  if (normalized.includes('gpt-4.1')) {
    return {
      family: 'GPT-4.1',
      description: 'Balanced model with strong instruction following and dependable document assistance.',
      profile: 'Balanced' as const,
      contextWindow: 'Large',
      capabilities: ['Instruction following', 'Coding', 'Analysis', 'Drafting'],
      bestFor: ['Daily chat', 'Document transforms', 'Reliable summaries'],
      recommendedParameters: createRecommendation(
        0.35,
        9000,
        'A balanced preset for mixed analysis and content generation.'
      ),
    };
  }

  return {
    family: 'OpenAI',
    description: 'General-purpose OpenAI model for chat, drafting, and structured responses.',
    profile: 'Balanced' as const,
    contextWindow: 'Standard',
    capabilities: ['General chat', 'Writing', 'Reasoning'],
    bestFor: ['General assistance'],
    recommendedParameters: FALLBACK_RECOMMENDATION,
  };
}

function getClaudeMetadata(modelId: string) {
  const normalized = normalizeId(modelId);

  if (normalized.includes('opus')) {
    return {
      family: 'Claude Opus',
      description: 'Claude’s deepest reasoning tier for complex synthesis, planning, and premium-quality writing.',
      profile: 'Deep' as const,
      contextWindow: 'Large',
      capabilities: ['Deep reasoning', 'Long-form writing', 'Complex synthesis', 'Review'],
      bestFor: ['Executive writing', 'High-stakes analysis', 'Difficult prompts'],
      recommendedParameters: createRecommendation(
        0.2,
        12000,
        'Optimized for deliberative, high-consistency responses.'
      ),
    };
  }

  if (normalized.includes('haiku')) {
    return {
      family: 'Claude Haiku',
      description: 'Fast Claude tier tuned for quick answers, lightweight edits, and responsive iteration.',
      profile: 'Fast' as const,
      contextWindow: 'Large',
      capabilities: ['Fast responses', 'Drafting', 'Summaries', 'Light reasoning'],
      bestFor: ['Rapid iteration', 'Short edits', 'Quick summaries'],
      recommendedParameters: createRecommendation(
        0.4,
        6000,
        'Slightly higher temperature keeps short outputs natural without drifting.'
      ),
    };
  }

  return {
    family: 'Claude Sonnet',
    description: 'Balanced Claude model for polished writing, analysis, and dependable office work.',
    profile: 'Balanced' as const,
    contextWindow: 'Large',
    capabilities: ['Writing', 'Analysis', 'Instruction following', 'Refinement'],
    bestFor: ['Polished drafts', 'Document review', 'Mixed workloads'],
    recommendedParameters: createRecommendation(
      0.3,
      10000,
      'A balanced preset that works well for drafting and review flows.'
    ),
  };
}

function getGeminiMetadata(modelId: string) {
  const normalized = normalizeId(modelId);

  if (normalized.includes('flash')) {
    return {
      family: 'Gemini Flash',
      description: 'Latency-focused Gemini tier for quick assistance, rapid summaries, and lightweight generation.',
      profile: 'Fast' as const,
      contextWindow: 'Large',
      capabilities: ['Fast responses', 'Multimodal-friendly', 'Summaries', 'General chat'],
      bestFor: ['Live drafting', 'Quick questions', 'Frequent iteration'],
      recommendedParameters: createRecommendation(
        0.45,
        8000,
        'Fast models benefit from a slightly more expressive temperature.'
      ),
    };
  }

  if (normalized.includes('pro')) {
    return {
      family: 'Gemini Pro',
      description: 'Reasoning-oriented Gemini model for more demanding analysis and long-context work.',
      profile: 'Deep' as const,
      contextWindow: 'Large',
      capabilities: ['Reasoning', 'Large context', 'Analysis', 'Multimodal-friendly'],
      bestFor: ['Research-heavy prompts', 'Larger documents', 'Complex analysis'],
      recommendedParameters: createRecommendation(
        0.25,
        10000,
        'Keeps longer outputs grounded while supporting more complex tasks.'
      ),
    };
  }

  return {
    family: 'Gemini',
    description: 'General-purpose Gemini model for multimodal-ready chat and document assistance.',
    profile: 'Balanced' as const,
    contextWindow: 'Large',
    capabilities: ['General chat', 'Multimodal-friendly', 'Writing', 'Analysis'],
    bestFor: ['Mixed workloads'],
    recommendedParameters: FALLBACK_RECOMMENDATION,
  };
}

function getOllamaMetadata(modelId: string) {
  const normalized = normalizeId(modelId);

  if (normalized.includes('deepseek')) {
    return {
      family: 'DeepSeek',
      description: 'Open-weight reasoning and coding family commonly used for strong local technical workflows.',
      profile: 'Deep' as const,
      contextWindow: 'Depends on local model',
      capabilities: ['Local inference', 'Coding', 'Reasoning', 'Privacy'],
      bestFor: ['Private coding help', 'Local agents', 'Custom deployments'],
      recommendedParameters: createRecommendation(
        0.2,
        6144,
        'Lower temperature usually works best for local reasoning/coding models.'
      ),
    };
  }

  if (normalized.includes('qwen') || normalized.includes('llama') || normalized.includes('mistral')) {
    return {
      family: 'Open-weight chat',
      description: 'Popular open model family served locally through Ollama for private, controllable workflows.',
      profile: 'Balanced' as const,
      contextWindow: 'Depends on local model',
      capabilities: ['Local inference', 'Privacy', 'General chat', 'Customizable'],
      bestFor: ['Offline usage', 'Local experimentation', 'Private documents'],
      recommendedParameters: createRecommendation(
        0.45,
        4096,
        'A balanced local preset that avoids overly random long generations.'
      ),
    };
  }

  return {
    family: 'Ollama',
    description: 'Locally hosted model exposed through Ollama.',
    profile: 'Balanced' as const,
    contextWindow: 'Depends on local model',
    capabilities: ['Local inference', 'Privacy', 'Custom deployment'],
    bestFor: ['Private workflows'],
    recommendedParameters: createRecommendation(
      0.45,
      4096,
      'Safe local default for general assistant behavior.'
    ),
  };
}

function getNvidiaMetadata(modelId: string) {
  const normalized = normalizeId(modelId);

  if (normalized.includes('nemotron')) {
    return {
      family: 'Nemotron',
      description: 'NVIDIA-tuned reasoning family for hosted open-model experimentation and analysis.',
      profile: 'Deep' as const,
      contextWindow: 'Varies by model',
      capabilities: ['Reasoning', 'Hosted open model', 'Analysis', 'Coding'],
      bestFor: ['Open-model evaluation', 'Reasoning tasks', 'Hosted experiments'],
      recommendedParameters: createRecommendation(
        0.25,
        10000,
        'Lower temperature keeps open reasoning models steadier.'
      ),
    };
  }

  return {
    family: 'NVIDIA',
    description: 'Hosted open model available through NVIDIA inference endpoints.',
    profile: 'Balanced' as const,
    contextWindow: 'Varies by model',
    capabilities: ['Hosted inference', 'Open models', 'General chat'],
    bestFor: ['Flexible hosted setups'],
    recommendedParameters: FALLBACK_RECOMMENDATION,
  };
}

function getMetadataByProvider(providerType: ProviderType, modelId: string) {
  switch (providerType) {
    case 'openai':
      return getOpenAIMetadata(modelId);
    case 'claude':
      return getClaudeMetadata(modelId);
    case 'gemini':
      return getGeminiMetadata(modelId);
    case 'ollama':
      return getOllamaMetadata(modelId);
    case 'nvidia':
      return getNvidiaMetadata(modelId);
    default: {
      const exhaustive: never = providerType;
      throw new Error(`Unsupported provider type: ${exhaustive}`);
    }
  }
}

export function getProviderPreset(providerType: ProviderType): ProviderPreset {
  return PROVIDER_PRESETS[providerType];
}

export function enrichModel(providerType: ProviderType, model: Model): Model {
  const metadata = getMetadataByProvider(providerType, model.modelId);

  return {
    ...model,
    name: model.name || model.modelId,
    family: metadata.family,
    description: metadata.description,
    profile: metadata.profile,
    contextWindow: metadata.contextWindow,
    capabilities: metadata.capabilities,
    limitations: model.limitations || getModelLimitations(providerType, metadata.profile),
    bestFor: metadata.bestFor,
    recommendedParameters: metadata.recommendedParameters,
  };
}

export function getEffectiveModelParameters(
  provider: Pick<Provider, 'type' | 'autoParameters' | 'temperature' | 'maxTokens'>,
  model: Pick<Model, 'modelId' | 'recommendedParameters'>,
  options?: AutoTuneOptions
): RecommendedModelParameters & { source: 'auto' | 'manual' } {
  const optimizationGoal = options?.optimizationGoal || 'balanced';
  const taskIntent = options?.taskIntent || 'general';

  if (provider.autoParameters && model.recommendedParameters) {
    const tuned = applyAutoTuneStrategy(
      model.recommendedParameters,
      optimizationGoal,
      taskIntent
    );
    const adjusted = applyManualOverrides(tuned, options?.overrides);

    return {
      ...adjusted,
      source: 'auto',
    };
  }

  const manualBase: RecommendedModelParameters = {
    temperature: provider.temperature,
    maxTokens: provider.maxTokens,
    note: provider.autoParameters
      ? `No model-specific preset found for ${model.modelId}; using provider defaults.`
      : 'Using manually configured provider defaults.',
  };
  const adjusted = applyManualOverrides(manualBase, options?.overrides);

  return {
    ...adjusted,
    source: 'manual',
  };
}
