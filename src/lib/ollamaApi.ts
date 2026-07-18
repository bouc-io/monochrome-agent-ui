import { useContext, useRef, useCallback } from 'react';
import { AuthContext } from '@/auth/authcontext';
import axios from 'axios';
import logger from '@/lib/logger';

const log = logger.child('OllamaAPI');

// Get environment variables from window.ENV (injected at runtime)
declare global {
    interface Window {
        ENV: {
            VITE_OLLAMA_API_URL: string;
            VITE_SSO_SERVER_URL: string;
            VITE_OAUTH_REALM: string;
            VITE_OAUTH_CLIENT_ID: string;
            VITE_API_URL: string;
        };
    }
}

// Function to get environment variable with fallback to import.meta.env
const getEnvVar = (key: keyof Window['ENV']): string => {
    return window.ENV?.[key] || import.meta.env[key] || '';
};

// Create a dedicated axios instance for Ollama API
const ollamaAxios = axios.create({
    baseURL: getEnvVar('VITE_OLLAMA_API_URL'),
    headers: {
        "Content-Type": "application/json",
    },
});

export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export interface OllamaResponse {
    message: {
        content: string;
        role: string;
        thinking?: string;
    };
}

export interface StreamCallbacks {
    onToken: (token: string) => void;
    onThinking?: (thinking: string) => void;
    onDone: () => void;
    onError: (error: Error) => void;
}

export const useOllamaApi = () => {
    const authContext = useContext(AuthContext);
    const abortControllerRef = useRef<AbortController | null>(null);

    if (!authContext) {
        throw new Error('useOllamaApi must be used within AuthProvider');
    }

    const stopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            log.info('Generation stopped by user');
        }
    }, []);

    const sendMessageStreaming = useCallback(async (
        messages: Message[], 
        model: string = 'llama3.2',
        callbacks: StreamCallbacks
    ): Promise<void> => {
        log.info('Preparing Ollama API streaming request...');
        log.info('- Model:', model);
        
        // Cancel any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        try {
            const token = authContext.authTokens?.access;
            if (!token) {
                throw new Error('No authentication token available');
            }

            const baseUrl = getEnvVar('VITE_OLLAMA_API_URL');
            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-auth-request-access-token': token
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: true,
                }),
                signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Response body is not readable');
            }

            const decoder = new TextDecoder();
            let buffer = '';
            let thinkingContent = '';
            let jsonThinkingContent = '';
            let isInThinkingBlock = false;

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    // Emit final accumulated thinking content from either source
                    const finalThinking = jsonThinkingContent || thinkingContent;
                    if (finalThinking && callbacks.onThinking) {
                        callbacks.onThinking(finalThinking);
                    }
                    callbacks.onDone();
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                
                // Process complete JSON objects from buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    try {
                        const data = JSON.parse(line);
                        
                        // Handle thinking parameter from JSON (new format) - accumulate it
                        if (data.message?.thinking) {
                            jsonThinkingContent += data.message.thinking;
                            if (callbacks.onThinking) {
                                callbacks.onThinking(jsonThinkingContent);
                            }
                        }
                        
                        if (data.message?.content) {
                            const content = data.message.content;
                            
                            // Handle thinking blocks in content (legacy format)
                            if (content.includes('<think>')) {
                                isInThinkingBlock = true;
                            }
                            
                            if (isInThinkingBlock) {
                                thinkingContent += content;
                                if (content.includes('</think>')) {
                                    isInThinkingBlock = false;
                                    // Extract content after </think>
                                    const afterThink = thinkingContent.split('</think>')[1] || '';
                                    if (afterThink) {
                                        callbacks.onToken(afterThink);
                                    }
                                    if (callbacks.onThinking) {
                                        const thinkMatch = thinkingContent.match(/<think>([\s\S]*?)<\/think>/);
                                        if (thinkMatch) {
                                            callbacks.onThinking(thinkMatch[1]);
                                        }
                                    }
                                    thinkingContent = '';
                                }
                            } else {
                                callbacks.onToken(content);
                            }
                        }
                        
                        if (data.done) {
                            callbacks.onDone();
                            return;
                        }
                    } catch (e) {
                        // Ignore JSON parse errors for incomplete chunks
                        log.debug('Skipping incomplete JSON chunk');
                    }
                }
            }

            log.info('Streaming completed successfully');
            
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                log.info('Request aborted');
                callbacks.onDone();
                return;
            }
            log.error('Error in streaming:', error);
            callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
        } finally {
            abortControllerRef.current = null;
        }
    }, [authContext.authTokens?.access]);

    const sendMessage = async (messages: Message[], model: string = 'llama3.2'): Promise<OllamaResponse> => {
        log.info('Preparing Ollama API request...');
        log.info('- Model:', model);
        
        try {
            const token = authContext.authTokens?.access;
            if (!token) {
                throw new Error('No authentication token available');
            }

            const response = await ollamaAxios.post<OllamaResponse>('/api/chat', {
                model: model,
                messages: messages,
                stream: false,
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-auth-request-access-token': token
                }
            });

            log.info('Message sent successfully to Ollama');
            
            if (response.data.message.thinking) {
                log.info('Reasoning detected in JSON:', response.data.message.thinking);
                const thinkingText = response.data.message.thinking;
                const content = response.data.message.content;
                response.data.message.content = `<think>${thinkingText}</think>\n\n${content}`;
                log.info('Combined message with reasoning');
            } else if (response.data.message.content.includes('<think>')) {
                log.info('Reasoning detected in <think> tags');
            } else {
                log.info('No reasoning in response');
            }
            
            return response.data;
        } catch (error) {
            log.error('Error sending message to Ollama:', error);
            throw error;
        }
    };

    return { sendMessage, sendMessageStreaming, stopGeneration };
};

export default ollamaAxios;