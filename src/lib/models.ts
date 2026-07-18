import logger from '@/lib/logger';

const log = logger.child('Models');

export interface LLMModel {
  id: string;
  name: string;
  description: string;
}

// Function to get environment variable with fallback to import.meta.env
const getEnvVar = (key: string): string => {
  return (window as { ENV?: Record<string, string> }).ENV?.[key] || import.meta.env[key] || '';
};

export const getAvailableModels = (): LLMModel[] => {
  try {
    const modelsJson = getEnvVar('VITE_AVAILABLE_MODELS');
    if (modelsJson) {
      const parsed = JSON.parse(modelsJson);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    log.error('Error parsing VITE_AVAILABLE_MODELS:', error);
  }

  // Fallback to default models if env var is not set or invalid
  return [
    { id: "llama3.2:1b", name: "Llama 3.2", description: "Fast and efficient model" },
    { id: "gemma3:1b", name: "Gemma 3", description: "Most capable model on a single GPU" }
  ];
};
