import { useState, useEffect, useCallback, useRef } from 'react';
import {
    RunStatus,
    RunPlan,
    RunPlanStep,
    SSEToolCallData,
    SSEToolResultData,
    RunStreamCallbacks,
    RunDetailResponse,
    TokenUsage,
    ApprovalRequestResponse,
} from '@/lib/agentApi';
import logger from '@/lib/logger';

const log = logger.child('SSE');

export interface ActivityEntry {
    id: string;
    type: 'status' | 'tool_call' | 'tool_result' | 'snapshot' | 'error' | 'message' | 'distill' | 'reasoning' | 'approval';
    timestamp: Date;
    data: Record<string, unknown>;
}

export interface PendingApproval {
    approval_request_id: string;
    tool_name: string;
    tool_args: Record<string, unknown>;
    resolved: boolean;
    approved?: boolean;
    reason?: string;
}

export interface ToolCallEntry {
    id: string;
    tool_name: string;
    args: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output_summary?: string;
    success?: boolean;
    duration_ms?: number;
    timestamp: Date;
}

export interface UseRunStreamResult {
    status: RunStatus | null;
    plan: RunPlan | null;
    toolCalls: ToolCallEntry[];
    activityLog: ActivityEntry[];
    tokens: string;
    thinkingTokens: string;
    error: string | null;
    isConnected: boolean;
    currentStepIndex: number;
    runTokenUsage: TokenUsage | null;
    pendingApproval: PendingApproval | null;
    cancel: () => void;
    hydrate: (runDetail: RunDetailResponse) => void;
    resetAll: () => void;
    resolvePendingApproval: (approved: boolean, reason?: string) => void;
}

interface UseRunStreamOptions {
    streamUrl: string | null;
    streamHeaders?: Record<string, string>;
    onCancel: () => Promise<void>;
    onMessageCreated?: (messageId: string, content?: string) => void;
    onStepReasoning?: (stepIndex: number, content: string) => void;
    onRunCompleted?: () => void;
    onRunFailed?: (error: string) => void;
}

export const useRunStream = ({
    streamUrl,
    streamHeaders,
    onCancel,
    onMessageCreated,
    onStepReasoning,
    onRunCompleted,
    onRunFailed,
}: UseRunStreamOptions): UseRunStreamResult => {
    const [status, setStatus] = useState<RunStatus | null>(null);
    const [plan, setPlan] = useState<RunPlan | null>(null);
    const [toolCalls, setToolCalls] = useState<ToolCallEntry[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
    const [tokens, setTokens] = useState('');
    const [thinkingTokens, setThinkingTokens] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [runTokenUsage, setRunTokenUsage] = useState<TokenUsage | null>(null);
    const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const tokensRef = useRef('');
    const thinkingTokensRef = useRef('');

    const addActivity = useCallback((type: ActivityEntry['type'], data: Record<string, unknown>) => {
        setActivityLog(prev => [...prev, {
            id: crypto.randomUUID(),
            type,
            timestamp: new Date(),
            data,
        }]);
    }, []);

    const cancel = useCallback(async () => {
        try {
            await onCancel();
        } catch (err) {
            log.error('Failed to cancel run:', err);
        }
    }, [onCancel]);

    // Reset only transient per-run state when a NEW stream starts; preserve activity & tool calls
    const prevStreamUrlRef = useRef<string | null>(null);
    useEffect(() => {
        if (streamUrl && streamUrl !== prevStreamUrlRef.current) {
            // Add a visual separator so the user can distinguish runs
            setActivityLog(prev => prev.length > 0 ? [...prev, {
                id: crypto.randomUUID(),
                type: 'status' as const,
                timestamp: new Date(),
                data: { status: 'new_run', event: 'run_separator' },
            }] : prev);

            // Reset transient state only
            setStatus(null);
            setPlan(null);
            setTokens('');
            setThinkingTokens('');
            setError(null);
            setRunTokenUsage(null);
            setCurrentStepIndex(0);
            setPendingApproval(null);
            tokensRef.current = '';
            thinkingTokensRef.current = '';
        }
        prevStreamUrlRef.current = streamUrl;
    }, [streamUrl]);

    const resetAll = useCallback(() => {
        setStatus(null);
        setPlan(null);
        setToolCalls([]);
        setActivityLog([]);
        setTokens('');
        setThinkingTokens('');
        setError(null);
        setRunTokenUsage(null);
        setCurrentStepIndex(0);
        setPendingApproval(null);
        tokensRef.current = '';
        thinkingTokensRef.current = '';
    }, []);

    // Optimistic UI: mark the pending approval as resolved before the SSE confirmation arrives
    const resolvePendingApproval = useCallback((approved: boolean, reason?: string) => {
        setPendingApproval(prev =>
            prev ? { ...prev, resolved: true, approved, reason } : null
        );
    }, []);

    useEffect(() => {
        if (!streamUrl) {
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        const abortController = new AbortController();
        abortRef.current = abortController;

        const handleEvent = (eventType: string, data: Record<string, unknown>) => {
            log.debug('event received:', eventType, data);

            switch (eventType) {
                case 'run.status':
                    setStatus(data.status as RunStatus);
                    addActivity('status', data);
                    break;

                case 'run.snapshot':
                    addActivity('snapshot', data);
                    break;

                case 'plan.created': {
                    log.info('plan.created raw data:', JSON.stringify(data));
                    const rawSteps = data.steps as any[] | undefined;
                    const stepsCount = (data.steps_count as number) || rawSteps?.length || 0;
                    const steps: RunPlanStep[] = rawSteps
                        ? rawSteps.map((s: any) => ({
                            id: s.id ?? s.step_index,
                            description: s.description || s.desc || s.title || s.name || `Step ${s.id ?? s.step_index}`,
                        }))
                        : Array.from({ length: stepsCount }, (_, i) => ({ id: i + 1, description: `Step ${i + 1}` }));
                    log.debug('plan steps mapped:', steps);
                    setPlan({ goal: (data.goal as string) || '', steps });
                    addActivity('status', { event: 'plan.created', ...data });
                    break;
                }

                case 'step.reasoning':
                    addActivity('reasoning', data);
                    onStepReasoning?.(
                        data.step_index as number,
                        (data.content as string) || (data.summary as string) || ''
                    );
                    break;

                case 'token':
                    if (data.thinking) {
                        thinkingTokensRef.current += data.thinking;
                        setThinkingTokens(thinkingTokensRef.current);
                    } else {
                        tokensRef.current += (data.token as string || '');
                        setTokens(tokensRef.current);
                    }
                    break;

                case 'tool.call':
                    log.info('tool.call:', data.tool_name, data.args);
                    setCurrentStepIndex(prev => prev + 1);
                    setToolCalls(prev => [...prev, {
                        id: (data.id as string) || crypto.randomUUID(),
                        tool_name: data.tool_name as string,
                        args: (data.args as Record<string, unknown>) || {},
                        status: 'running',
                        timestamp: new Date(),
                    }]);
                    addActivity('tool_call', data);
                    break;

                case 'tool.result':
                    log.info('tool.result:', data.tool_name, 'success:', data.success);
                    setToolCalls(prev => prev.map(tc =>
                        (tc.id === data.id || tc.tool_name === data.tool_name)
                            ? {
                                ...tc,
                                status: data.success ? 'completed' as const : 'failed' as const,
                                output_summary: data.output_summary as string | undefined,
                                success: data.success as boolean | undefined,
                                duration_ms: data.duration_ms as number | undefined,
                            }
                            : tc
                    ));
                    addActivity('tool_result', data);
                    break;

                case 'message.created':
                    log.info('message.created raw data:', JSON.stringify(data));
                    addActivity('message', data);
                    onMessageCreated?.((data.message_id as string) || (data.id as string), data.content as string | undefined);
                    break;

                case 'run.usage': {
                    const usage: TokenUsage = {
                        prompt_tokens:     (data.prompt_tokens as number) || 0,
                        completion_tokens: (data.completion_tokens as number) || 0,
                        total_tokens:      (data.total_tokens as number) || 0,
                        llm_calls:         (data.llm_calls as number) || 0,
                    };
                    setRunTokenUsage(usage);
                    break;
                }

                case 'run.completed':
                    log.info('run completed');
                    setStatus('completed');
                    // Capture token_usage if present (emitted alongside run.completed)
                    if (data.token_usage) {
                        setRunTokenUsage(data.token_usage as TokenUsage);
                    }
                    addActivity('status', { status: 'completed', ...data });
                    onRunCompleted?.();
                    abortController.abort();
                    setIsConnected(false);
                    break;

                case 'run.failed':
                    log.error('run failed:', data.error);
                    setStatus('failed');
                    setError((data.error as string) || 'Run failed');
                    addActivity('error', data);
                    onRunFailed?.((data.error as string) || 'Run failed');
                    abortController.abort();
                    setIsConnected(false);
                    break;

                case 'run.cancelled':
                    log.warn('run cancelled');
                    setStatus('cancelled');
                    addActivity('status', { status: 'cancelled', ...data });
                    abortController.abort();
                    setIsConnected(false);
                    break;

                case 'distill.triggered':
                    addActivity('distill', data);
                    break;

                case 'tool.approval_required':
                    log.info('tool.approval_required:', data.tool_name, data.approval_request_id);
                    setPendingApproval({
                        approval_request_id: data.approval_request_id as string,
                        tool_name: data.tool_name as string,
                        tool_args: (data.tool_args as Record<string, unknown>) || {},
                        resolved: false,
                    });
                    setStatus('pending_approval');
                    addActivity('approval', { event: 'approval_required', ...data });
                    break;

                case 'tool.approval_resolved':
                    log.info('tool.approval_resolved:', data.tool_name, 'approved:', data.approved);
                    setPendingApproval(prev =>
                        prev ? { ...prev, resolved: true, approved: data.approved as boolean, reason: data.reason as string | undefined } : null
                    );
                    setStatus('running');
                    addActivity('approval', { event: 'approval_resolved', ...data });
                    break;

                case 'plan.updated': {
                    log.info('plan.updated:', data.goal, 'steps:', data.steps_count);
                    const rawSteps = data.steps as any[] | undefined;
                    const updatedSteps: RunPlanStep[] = rawSteps
                        ? rawSteps.map((s: any) => ({
                            id: s.id ?? s.step_index,
                            description: s.description || `Step ${s.id ?? s.step_index}`,
                        }))
                        : [];
                    setPlan({ goal: (data.goal as string) || '', steps: updatedSteps });
                    addActivity('status', { event: 'plan.updated', ...data });
                    break;
                }

                default:
                    log.warn('Unknown SSE event:', eventType, data);
            }
        };

        const connectStream = async () => {
            try {
                log.info('🔌 Connecting to SSE stream:', streamUrl);
                const response = await fetch(streamUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/event-stream',
                        ...(streamHeaders || {}),
                    },
                    credentials: 'include',
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
                }

                log.info('✅ SSE connected');
                setIsConnected(true);

                const reader = response.body?.getReader();
                if (!reader) throw new Error('No readable stream available');

                const decoder = new TextDecoder();
                let buffer = '';
                // Persist across chunks — SSE event/data lines may span multiple reader reads
                let currentEventType = 'message';
                let currentData = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Parse SSE lines
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer

                    for (const line of lines) {
                        if (line.startsWith('event:')) {
                            currentEventType = line.slice(6).trim();
                        } else if (line.startsWith('data:')) {
                            currentData += line.slice(5).trim();
                        } else if (line === '') {
                            // Empty line = end of event
                            if (currentData) {
                                try {
                                    const parsed = JSON.parse(currentData);
                                    // If generic message with a type field, use that
                                    const resolvedType = currentEventType === 'message' && parsed.type
                                        ? parsed.type
                                        : currentEventType;
                                    handleEvent(resolvedType, parsed);
                                } catch {
                                    log.warn('Failed to parse SSE data:', currentData.slice(0, 200));
                                }
                            }
                            currentEventType = 'message';
                            currentData = '';
                        }
                    }
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return; // Expected on cancel/cleanup
                log.error('❌ SSE error:', err);
                setError(err.message || 'Stream connection lost');
                setIsConnected(false);
            }
        };

        connectStream();

        return () => {
            log.debug('🔌 Closing SSE connection');
            abortController.abort();
            abortRef.current = null;
            setIsConnected(false);
        };
    }, [streamUrl, streamHeaders, addActivity, onMessageCreated, onStepReasoning, onRunCompleted, onRunFailed]);

    // Hydrate state from a historical run detail (for page load / reload)
    const hydrate = useCallback((runDetail: RunDetailResponse) => {
        log.info('Hydrating run:', runDetail.id, 'status:', runDetail.status);
        setStatus(runDetail.status as RunStatus);
        if (runDetail.plan) {
            setPlan({
                goal: runDetail.plan.goal,
                steps: runDetail.plan.steps.map((s: any) => ({
                    id: s.id,
                    description: s.description || s.desc || `Step ${s.id}`,
                })),
            });
            const executionSteps = runDetail.steps?.filter((s: any) => s.type === 'execution') || [];
            const completedIndex = runDetail.status === 'completed'
                ? runDetail.plan.steps.length
                : executionSteps.length;
            setCurrentStepIndex(completedIndex);
        }

        // Build activity log from run metadata, steps, and tool calls
        const activities: ActivityEntry[] = [];

        // Synthesize status entries from run timestamps
        activities.push({
            id: runDetail.id + '-queued',
            type: 'status',
            timestamp: new Date(runDetail.created_at),
            data: { status: 'queued' },
        });
        if (runDetail.started_at) {
            activities.push({
                id: runDetail.id + '-running',
                type: 'status',
                timestamp: new Date(runDetail.started_at),
                data: { status: 'running' },
            });
        }

        // Synthesize snapshot entry from run.snapshot
        if (runDetail.snapshot && (runDetail.snapshot as Record<string, unknown>).memories_count !== undefined) {
            activities.push({
                id: runDetail.id + '-snapshot',
                type: 'snapshot',
                timestamp: new Date(runDetail.started_at || runDetail.created_at),
                data: { memories_count: (runDetail.snapshot as Record<string, unknown>).memories_count },
            });
        }

        // Process steps: extract planner reasoning, plan.created, and execution reasoning
        const planStep = runDetail.steps.find(s => s.type === 'plan');

        // Planner raw reasoning (persisted in plan step output as raw_reasoning)
        if (planStep?.output && (planStep.output as Record<string, unknown>).raw_reasoning) {
            activities.push({
                id: planStep.id + '-reasoning',
                type: 'reasoning',
                timestamp: new Date(planStep.created_at),
                data: {
                    step_index: 0,
                    content: (planStep.output as Record<string, unknown>).raw_reasoning,
                    summary: 'Planning phase: analyzing request and creating execution plan',
                },
            });
        }

        // Synthesize plan.created entry
        if (runDetail.plan && planStep) {
            activities.push({
                id: planStep.id + '-plan',
                type: 'status',
                timestamp: new Date(planStep.created_at),
                data: { event: 'plan.created', goal: runDetail.plan.goal },
            });
        }

        // Execution steps (reasoning entries)
        for (const step of runDetail.steps) {
            if (step.type === 'execution' && step.output) {
                activities.push({
                    id: step.id,
                    type: 'reasoning',
                    timestamp: new Date(step.created_at),
                    data: {
                        step_index: step.step_index,
                        content: (step.output as Record<string, unknown>).content || null,
                        summary: (step.output as Record<string, unknown>).summary || null,
                    },
                });
            }
        }

        // Tool calls and results
        for (const tc of runDetail.tool_calls) {
            activities.push({
                id: tc.id,
                type: 'tool_call',
                timestamp: new Date(tc.created_at),
                data: { tool_name: tc.tool_name, args: tc.tool_input },
            });
            if (tc.status === 'completed' || tc.status === 'failed') {
                activities.push({
                    id: tc.id + '-result',
                    type: 'tool_result',
                    timestamp: new Date(tc.ended_at || tc.created_at),
                    data: {
                        tool_name: tc.tool_name,
                        success: tc.status === 'completed',
                        output_summary: tc.tool_output
                            ? JSON.stringify(tc.tool_output).slice(0, 200)
                            : null,
                    },
                });
            }
        }

        // Synthesize message created + final status
        if (runDetail.ended_at) {
            if (runDetail.status === 'completed') {
                activities.push({
                    id: runDetail.id + '-message',
                    type: 'message',
                    timestamp: new Date(runDetail.ended_at),
                    data: { role: 'assistant' },
                });
            }
            activities.push({
                id: runDetail.id + '-final',
                type: 'status',
                timestamp: new Date(runDetail.ended_at),
                data: { status: runDetail.status },
            });
        }

        activities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setActivityLog(prev => [...prev, ...activities]);

        setToolCalls(prev => [...prev, ...runDetail.tool_calls.map((tc) => ({
            id: tc.id,
            tool_name: tc.tool_name,
            args: tc.tool_input,
            status: tc.status,
            output_summary: tc.tool_output
                ? JSON.stringify(tc.tool_output).slice(0, 200)
                : undefined,
            success: tc.status === 'completed',
            duration_ms: tc.duration_ms ?? undefined,
            timestamp: new Date(tc.created_at),
        }))]);
        // Set token usage from completed run
        if (runDetail.status === 'completed' && (runDetail.total_tokens ?? 0) > 0) {
            setRunTokenUsage({
                prompt_tokens:     runDetail.prompt_tokens     ?? 0,
                completion_tokens: runDetail.completion_tokens ?? 0,
                total_tokens:      runDetail.total_tokens      ?? 0,
                llm_calls:         runDetail.llm_calls         ?? 0,
            });
        }

        log.debug('Hydration complete, activities:', activities.length);
    }, []);

    return {
        status,
        plan,
        toolCalls,
        activityLog,
        tokens,
        thinkingTokens,
        error,
        isConnected,
        currentStepIndex,
        runTokenUsage,
        pendingApproval,
        cancel,
        hydrate,
        resetAll,
        resolvePendingApproval,
    };
};
