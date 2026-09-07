import { useContext, useCallback } from "react";
import { AuthContext } from "@/auth/authcontext";
import axios from "axios";
import logger from "@/lib/logger";

const log = logger.child("AgentAPI");

// Function to get environment variable with fallback to import.meta.env
const getEnvVar = (key: string): string => {
  const windowEnv = (window as { ENV?: Record<string, string> }).ENV;
  return windowEnv?.[key] || import.meta.env[key] || "";
};

// Create a dedicated axios instance for agent API
const agentAxios = axios.create({
  baseURL: getEnvVar("VITE_API_URL"),
  headers: {
    "Content-Type": "application/json",
  },
});

// ==================== INTERFACES ====================

// Pagination response structure
export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface MessagePaginationResponse {
  has_more: boolean;
}

// Assignment metadata
export interface AssignmentMetadata {
  tags?: string[];
  starred?: boolean;
  context?: string;
  [key: string]: unknown;
}

// Assignment settings
export interface AssignmentSettings {
  enabled_tools?: string[];
  memory_settings?: Record<string, unknown>;
  [key: string]: unknown;
}

// API response format for Assignment
export interface AssignmentResponse {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  metadata: AssignmentMetadata;
  settings?: AssignmentSettings;
  user_id: string;
  is_archived: boolean;
}

// Internal Assignment representation
export interface Assignment {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  message_count: number;
  metadata: AssignmentMetadata;
  settings: AssignmentSettings;
  is_archived: boolean;
}

// List assignments response
export interface ListAssignmentsResponse {
  data: AssignmentResponse[];
  pagination: PaginationResponse;
}

// Message metadata
export interface MessageMetadata {
  tokens?: number;
  model?: string | null;
  finish_reason?: string;
  client_id?: string;
  [key: string]: unknown;
}

// API response format for Message
export interface MessageResponse {
  id: string;
  assignment_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  metadata: MessageMetadata;
  provenance?: { run_id?: string } | null;
}

// Internal Message representation
export interface AgentMessage {
  id: string;
  assignment_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: Date;
  metadata: MessageMetadata;
  run_id?: string;
}

// List messages response
export interface ListMessagesResponse {
  data: MessageResponse[];
  pagination: MessagePaginationResponse;
}

// ==================== RUN INTERFACES ====================

export type RunStatus =
  | "queued"
  | "running"
  | "pending_approval"
  | "completed"
  | "failed"
  | "cancelled";
export type ToolCallStatus = "pending" | "running" | "completed" | "failed";

export interface RunResponse {
  id: string;
  assignment_id: string;
  status: RunStatus;
  plan?: RunPlan | null;
  snapshot?: Record<string, unknown>;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  error?: string | null;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  llm_calls?: number;
}

export interface RunPlan {
  goal: string;
  steps: RunPlanStep[];
}

export interface RunPlanStep {
  id: number;
  description: string;
}

export interface ToolCallResponse {
  id: string;
  run_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: Record<string, unknown> | null;
  status: ToolCallStatus;
  created_at: string;
  ended_at?: string | null;
  duration_ms?: number | null;
}

export interface CreateMessageV2Response {
  assignment_id: string;
  user_message: MessageResponse;
  run: {
    id: string;
    status: RunStatus;
    stream_url: string;
  };
}

export interface CreateRunRequest {
  agent_id?: string;
  trigger_message_id?: string;
}

export interface CreateRunResponse {
  run: {
    id: string;
    status: RunStatus;
    created_at: string;
  };
  stream_url: string;
}

export interface RunStepResponse {
  id: string;
  run_id: string;
  step_index: number;
  type: "plan" | "execution" | "tool_call";
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  created_at: string;
}

export interface ApprovalRequestResponse {
  id: string;
  run_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  decided_by?: string | null;
  reason?: string | null;
  created_at: string;
  decided_at?: string | null;
}

export interface ApproveRunRequest {
  approval_request_id: string;
  approved: boolean;
  reason?: string;
}

export interface RunDetailResponse extends RunResponse {
  steps: RunStepResponse[];
  tool_calls: ToolCallResponse[];
  approval_requests: ApprovalRequestResponse[];
  feedback?: { rating: string; comment?: string | null } | null;
}

export interface RunsListResponse {
  data: RunResponse[];
  pagination: PaginationResponse;
}

// SSE Event types
export type SSEEventType =
  | "run.status"
  | "run.snapshot"
  | "plan.created"
  | "step.reasoning"
  | "token"
  | "tool.call"
  | "tool.result"
  | "message.created"
  | "run.usage"
  | "run.completed"
  | "run.failed"
  | "run.cancelled"
  | "distill.triggered";

export interface SSERunStatusData {
  status: RunStatus;
}

export interface SSERunSnapshotData {
  memories_count: number;
  retrieval_count: number;
}

export interface SSEPlanCreatedData {
  goal: string;
  steps_count: number;
  steps?: RunPlanStep[];
}

export interface SSETokenData {
  token: string;
}

export interface SSEToolCallData {
  id?: string;
  tool_name: string;
  args: Record<string, unknown>;
}

export interface SSEToolResultData {
  id?: string;
  tool_name: string;
  success: boolean;
  output_summary: string;
  duration_ms?: number;
}

export interface SSEMessageCreatedData {
  message_id: string;
  id?: string;
  role: string;
  content?: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  llm_calls: number;
}

export interface SSERunUsageData {
  run_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  llm_calls: number;
}

export interface SSERunCompletedData {
  run_id: string;
  token_usage?: TokenUsage;
}

export interface SSERunFailedData {
  error: string;
}

export interface SSERunCancelledData {
  run_id: string;
}

export interface RunStreamCallbacks {
  onRunStatus?: (data: SSERunStatusData) => void;
  onRunSnapshot?: (data: SSERunSnapshotData) => void;
  onPlanCreated?: (data: SSEPlanCreatedData) => void;
  onToken?: (data: SSETokenData) => void;
  onToolCall?: (data: SSEToolCallData) => void;
  onToolResult?: (data: SSEToolResultData) => void;
  onMessageCreated?: (data: SSEMessageCreatedData) => void;
  onRunCompleted?: (data: SSERunCompletedData) => void;
  onRunFailed?: (data: SSERunFailedData) => void;
  onRunCancelled?: (data: SSERunCancelledData) => void;
  onError?: (error: Error) => void;
}

// Tool definition
export interface Tool {
  name: string;
  description: string;
  enabled: boolean;
  parameters?: Record<string, unknown>;
  schema?: Record<string, unknown>;
  policy?: Record<string, unknown>;
}

export interface ListToolsResponse {
  tools: Tool[];
}

// Error response
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Request interfaces
export interface ListAssignmentsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface ListMessagesParams {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

export interface CreateAssignmentRequest {
  title: string;
  metadata?: AssignmentMetadata;
}

export interface UpdateAssignmentRequest {
  title?: string;
  metadata?: AssignmentMetadata;
}

export interface CreateMessageRequest {
  content: string;
  role?: "user" | "assistant" | "system";
  options?: {
    agent_id?: string;
    stream?: boolean;
    client_type?: string;
  };
  idempotency_key?: string;
  metadata?: {
    client_id?: string;
    [key: string]: unknown;
  };
}

export interface FindSimilarAssignmentsRequest {
  reference_assignment_id: string;
  limit?: number;
  min_similarity?: number;
}

export interface AssignmentUsageSummary {
  assignment_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  llm_calls: number;
  run_count: number;
}

export interface UserUsageResponse {
  totals: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    llm_calls: number;
    completed_runs: number;
  };
  by_assignment: AssignmentUsageSummary[];
}

// ==================== HELPER FUNCTIONS ====================

const transformAssignmentResponse = (
  response: AssignmentResponse,
): Assignment => ({
  id: response.id,
  title: response.title,
  created_at: new Date(response.created_at),
  updated_at: new Date(response.updated_at),
  message_count: response.message_count || 0,
  metadata: response.metadata || {},
  settings: response.settings || {},
  is_archived: response.is_archived || false,
});

const transformMessageResponse = (response: MessageResponse): AgentMessage => ({
  id: response.id,
  assignment_id: response.assignment_id,
  role: response.role,
  content: response.content,
  created_at: new Date(response.created_at),
  metadata: response.metadata || {},
  run_id: response.provenance?.run_id,
});

// ==================== HOOK ====================

export const useAgentApi = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("useAgentApi must be used within AuthProvider");
  }

  const getAuthHeaders = useCallback(() => {
    const token = authContext.authTokens?.access;
    if (!token) {
      throw new Error("No authentication token available");
    }
    return {
      Authorization: `Bearer ${token}`,
      "x-auth-request-access-token": token,
    };
  }, [authContext.authTokens?.access]);

  // Generic retry wrapper
  const withRetry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      operationName: string,
      maxRetries = 3,
    ): Promise<T> => {
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          return await operation();
        } catch (error) {
          retryCount++;
          log.error(
            `Error in ${operationName} (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error(`Max retries reached for ${operationName}`);
            throw error;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      throw new Error(`Failed ${operationName} after maximum retries`);
    },
    [],
  );

  // ==================== ASSIGNMENTS ====================

  const getAllAssignments = useCallback(
    async (
      params: ListAssignmentsParams = {},
    ): Promise<{
      assignments: Assignment[];
      pagination: PaginationResponse;
    }> => {
      log.info("Retrieving all assignments...", params);

      return withRetry(async () => {
        const response = await agentAxios.get<
          | ListAssignmentsResponse
          | AssignmentResponse[]
          | { assignments: AssignmentResponse[] }
        >("/v1/assignments", {
          headers: getAuthHeaders(),
          params: {
            page: params.page || 1,
            limit: params.limit || 20,
            sort: params.sort || "updated_at",
            order: params.order || "desc",
          },
        });

        // Backends differ: some return { data, pagination }, others return an array.
        const raw: any = response.data;
        const list: AssignmentResponse[] = Array.isArray(raw)
          ? raw
          : (raw?.data ?? raw?.assignments ?? []);

        const pagination: PaginationResponse = raw?.pagination ?? {
          page: params.page || 1,
          limit: params.limit || list.length,
          total: raw?.total ?? list.length,
          total_pages: raw?.total_pages ?? 1,
        };

        log.debug("Assignments retrieved:", { count: list.length, pagination });

        return {
          assignments: list.map(transformAssignmentResponse),
          pagination,
        };
      }, "getAllAssignments");
    },
    [getAuthHeaders, withRetry],
  );

  const getAssignmentById = useCallback(
    async (assignmentId: string): Promise<Assignment> => {
      log.info("Retrieving assignment:", assignmentId);

      return withRetry(async () => {
        const response = await agentAxios.get<AssignmentResponse>(
          `/v1/assignments/${assignmentId}`,
          { headers: getAuthHeaders() },
        );

        log.debug("Assignment retrieved:", response.data.id);
        return transformAssignmentResponse(response.data);
      }, "getAssignmentById");
    },
    [getAuthHeaders, withRetry],
  );

  const createAssignment = useCallback(
    async (data: CreateAssignmentRequest): Promise<Assignment> => {
      log.info("Creating assignment:", data.title);

      return withRetry(async () => {
        const response = await agentAxios.post<AssignmentResponse>(
          "/v1/assignments",
          data,
          { headers: getAuthHeaders() },
        );

        log.info("✅ Assignment created:", response.data.id);
        return transformAssignmentResponse(response.data);
      }, "createAssignment");
    },
    [getAuthHeaders, withRetry],
  );

  const updateAssignment = useCallback(
    async (
      assignmentId: string,
      data: UpdateAssignmentRequest,
    ): Promise<Assignment> => {
      log.info("Updating assignment:", assignmentId);

      return withRetry(async () => {
        const response = await agentAxios.patch<AssignmentResponse>(
          `/v1/assignments/${assignmentId}`,
          data,
          { headers: getAuthHeaders() },
        );

        log.debug("Assignment updated:", response.data.id);
        return transformAssignmentResponse(response.data);
      }, "updateAssignment");
    },
    [getAuthHeaders, withRetry],
  );

  const deleteAssignment = useCallback(
    async (assignmentId: string): Promise<void> => {
      log.info("Deleting assignment:", assignmentId);

      return withRetry(async () => {
        await agentAxios.delete(`/v1/assignments/${assignmentId}`, {
          headers: getAuthHeaders(),
        });

        log.debug("Assignment deleted:", assignmentId);
      }, "deleteAssignment");
    },
    [getAuthHeaders, withRetry],
  );

  const archiveAssignment = useCallback(
    async (assignmentId: string): Promise<void> => {
      log.info("Archiving assignment:", assignmentId);

      return withRetry(async () => {
        await agentAxios.post(
          `/v1/assignments/${assignmentId}/archive`,
          {},
          { headers: getAuthHeaders() },
        );

        log.debug("Assignment archived:", assignmentId);
      }, "archiveAssignment");
    },
    [getAuthHeaders, withRetry],
  );

  const unarchiveAssignment = useCallback(
    async (assignmentId: string): Promise<void> => {
      log.info("Unarchiving assignment:", assignmentId);

      return withRetry(async () => {
        await agentAxios.post(
          `/v1/assignments/${assignmentId}/unarchive`,
          {},
          { headers: getAuthHeaders() },
        );

        log.debug("Assignment unarchived:", assignmentId);
      }, "unarchiveAssignment");
    },
    [getAuthHeaders, withRetry],
  );

  const findSimilarAssignments = useCallback(
    async (data: FindSimilarAssignmentsRequest): Promise<Assignment[]> => {
      log.info("Finding similar assignments:", data.reference_assignment_id);

      return withRetry(async () => {
        const response = await agentAxios.post<
          | { data?: AssignmentResponse[]; assignments?: AssignmentResponse[] }
          | AssignmentResponse[]
        >("/v1/assignments/similar", data, { headers: getAuthHeaders() });

        const raw: any = response.data;
        const list: AssignmentResponse[] = Array.isArray(raw)
          ? raw
          : (raw?.data ?? raw?.assignments ?? []);

        log.debug("Similar assignments found:", list.length);
        return list.map(transformAssignmentResponse);
      }, "findSimilarAssignments");
    },
    [getAuthHeaders, withRetry],
  );

  // ==================== MESSAGES ====================

  const getMessagesByAssignment = useCallback(
    async (
      assignmentId: string,
      params: ListMessagesParams = {},
    ): Promise<{
      messages: AgentMessage[];
      pagination: MessagePaginationResponse;
    }> => {
      log.info("Retrieving messages for assignment:", assignmentId);

      return withRetry(async () => {
        const response = await agentAxios.get<
          | ListMessagesResponse
          | MessageResponse[]
          | { messages: MessageResponse[] }
        >(`/v1/assignments/${assignmentId}/messages`, {
          headers: getAuthHeaders(),
          params,
        });

        const raw: any = response.data;
        const list: MessageResponse[] = Array.isArray(raw)
          ? raw
          : (raw?.data ?? raw?.messages ?? []);

        const pagination: MessagePaginationResponse = raw?.pagination ?? {
          has_more: false,
        };

        log.debug("Messages retrieved:", {
          count: list.length,
          hasMore: Boolean(pagination?.has_more),
        });

        return {
          messages: list.map(transformMessageResponse),
          pagination,
        };
      }, "getMessagesByAssignment");
    },
    [getAuthHeaders, withRetry],
  );

  const getMessageById = useCallback(
    async (assignmentId: string, messageId: string): Promise<AgentMessage> => {
      log.info("Retrieving message:", messageId);

      return withRetry(async () => {
        const response = await agentAxios.get<MessageResponse>(
          `/v1/assignments/${assignmentId}/messages/${messageId}`,
          { headers: getAuthHeaders() },
        );

        log.debug("Message retrieved:", response.data.id);
        return transformMessageResponse(response.data);
      }, "getMessageById");
    },
    [getAuthHeaders, withRetry],
  );

  const createMessage = useCallback(
    async (
      assignmentId: string,
      data: CreateMessageRequest,
    ): Promise<CreateMessageV2Response> => {
      log.info("Creating message in assignment:", assignmentId);

      return withRetry(async () => {
        const response = await agentAxios.post<CreateMessageV2Response>(
          `/v1/assignments/${assignmentId}/messages`,
          data,
          { headers: getAuthHeaders() },
        );

        log.info("✅ Message created:", response.data.user_message?.id);
        return response.data;
      }, "createMessage");
    },
    [getAuthHeaders, withRetry],
  );

  const deleteMessage = useCallback(
    async (assignmentId: string, messageId: string): Promise<void> => {
      log.info("Deleting message:", messageId);

      return withRetry(async () => {
        await agentAxios.delete(
          `/v1/assignments/${assignmentId}/messages/${messageId}`,
          { headers: getAuthHeaders() },
        );

        log.debug("Message deleted:", messageId);
      }, "deleteMessage");
    },
    [getAuthHeaders, withRetry],
  );

  const getAssignmentSummary = useCallback(
    async (assignmentId: string): Promise<string> => {
      log.info("Getting summary for assignment:", assignmentId);

      return withRetry(async () => {
        const response = await agentAxios.get<{ summary: string }>(
          `/v1/assignments/${assignmentId}/summary`,
          { headers: getAuthHeaders() },
        );

        log.debug("Summary retrieved");
        return response.data.summary;
      }, "getAssignmentSummary");
    },
    [getAuthHeaders, withRetry],
  );

  // ==================== TOOLS ====================

  const getAvailableTools = useCallback(async (): Promise<Tool[]> => {
    log.info("Retrieving available tools...");

    return withRetry(async () => {
      const response = await agentAxios.get<ListToolsResponse>("/v1/tools", {
        headers: getAuthHeaders(),
      });

      log.debug("Tools retrieved:", response.data.tools.length);
      return response.data.tools;
    }, "getAvailableTools");
  }, [getAuthHeaders, withRetry]);

  // ==================== RUNS ====================

  const createRun = useCallback(
    async (
      assignmentId: string,
      data: CreateRunRequest = {},
    ): Promise<CreateRunResponse> => {
      log.info("Creating run for assignment:", assignmentId);

      return withRetry(async () => {
        const response = await agentAxios.post<CreateRunResponse>(
          `/v1/assignments/${assignmentId}/runs`,
          data,
          { headers: getAuthHeaders() },
        );

        log.info("✅ Run created:", response.data.run?.id);
        return response.data;
      }, "createRun");
    },
    [getAuthHeaders, withRetry],
  );

  const getRunStatus = useCallback(
    async (assignmentId: string, runId: string): Promise<RunResponse> => {
      log.debug("Getting run status:", runId);

      return withRetry(async () => {
        const response = await agentAxios.get<RunResponse>(
          `/v1/assignments/${assignmentId}/runs/${runId}`,
          { headers: getAuthHeaders() },
        );

        log.debug("Run status:", response.data.status);
        return response.data;
      }, "getRunStatus");
    },
    [getAuthHeaders, withRetry],
  );

  const listRuns = useCallback(
    async (
      assignmentId: string,
      page = 1,
      limit = 10,
    ): Promise<RunsListResponse> => {
      return withRetry(async () => {
        const response = await agentAxios.get<RunsListResponse>(
          `/v1/assignments/${assignmentId}/runs`,
          { headers: getAuthHeaders(), params: { page, limit } },
        );
        return response.data;
      }, "listRuns");
    },
    [getAuthHeaders, withRetry],
  );

  const getRunDetail = useCallback(
    async (assignmentId: string, runId: string): Promise<RunDetailResponse> => {
      return withRetry(async () => {
        const response = await agentAxios.get<RunDetailResponse>(
          `/v1/assignments/${assignmentId}/runs/${runId}`,
          { headers: getAuthHeaders() },
        );
        return response.data;
      }, "getRunDetail");
    },
    [getAuthHeaders, withRetry],
  );

  const cancelRun = useCallback(
    async (assignmentId: string, runId: string): Promise<void> => {
      log.info("Cancelling run:", runId);

      const response = await agentAxios.post(
        `/v1/assignments/${assignmentId}/runs/${runId}/cancel`,
        {},
        { headers: getAuthHeaders() },
      );

      log.debug("Run cancel requested:", response.data);
    },
    [getAuthHeaders],
  );

  const approveRun = useCallback(
    async (
      assignmentId: string,
      runId: string,
      body: ApproveRunRequest,
    ): Promise<void> => {
      log.info(
        "Submitting approval decision for run:",
        runId,
        "approved:",
        body.approved,
      );
      await agentAxios.post(
        `/v1/assignments/${assignmentId}/runs/${runId}/approve`,
        body,
        { headers: getAuthHeaders() },
      );
    },
    [getAuthHeaders],
  );

  const submitRunFeedback = useCallback(
    async (
      assignmentId: string,
      runId: string,
      rating: "positive" | "negative",
      comment?: string,
    ): Promise<void> => {
      await agentAxios.post(
        `/v1/assignments/${assignmentId}/runs/${runId}/feedback`,
        { rating, comment },
        { headers: getAuthHeaders() },
      );
    },
    [getAuthHeaders],
  );

  const getRunApprovals = useCallback(
    async (
      assignmentId: string,
      runId: string,
    ): Promise<ApprovalRequestResponse[]> => {
      return withRetry(async () => {
        const response = await agentAxios.get<{
          data: ApprovalRequestResponse[];
        }>(`/v1/assignments/${assignmentId}/runs/${runId}/approvals`, {
          headers: getAuthHeaders(),
        });
        return response.data.data;
      }, "getRunApprovals");
    },
    [getAuthHeaders, withRetry],
  );

  const getRunStreamUrl = useCallback(
    (assignmentId: string, runId: string): string => {
      const baseUrl = getEnvVar("VITE_API_URL");
      return `${baseUrl}/v1/assignments/${assignmentId}/runs/${runId}/stream`;
    },
    [],
  );

  const getRunStreamHeaders = useCallback(() => {
    return getAuthHeaders();
  }, [getAuthHeaders]);

  // ==================== USAGE ====================

  const getUserUsage = useCallback(async (): Promise<UserUsageResponse> => {
    return withRetry(async () => {
      const response = await agentAxios.get<UserUsageResponse>("/v1/usage", {
        headers: getAuthHeaders(),
      });
      return response.data;
    }, "getUserUsage");
  }, [getAuthHeaders, withRetry]);

  const getAssignmentUsage = useCallback(
    async (assignmentId: string): Promise<AssignmentUsageSummary> => {
      return withRetry(async () => {
        const response = await agentAxios.get<AssignmentUsageSummary>(
          `/v1/usage/assignments/${assignmentId}`,
          { headers: getAuthHeaders() },
        );
        return response.data;
      }, "getAssignmentUsage");
    },
    [getAuthHeaders, withRetry],
  );

  return {
    // Assignments
    getAllAssignments,
    getAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    archiveAssignment,
    unarchiveAssignment,
    findSimilarAssignments,

    // Messages
    getMessagesByAssignment,
    getMessageById,
    createMessage,
    deleteMessage,
    getAssignmentSummary,

    // Runs
    createRun,
    getRunStatus,
    listRuns,
    getRunDetail,
    cancelRun,
    approveRun,
    getRunApprovals,
    submitRunFeedback,
    getRunStreamUrl,
    getRunStreamHeaders,

    // Tools
    getAvailableTools,

    // Usage
    getUserUsage,
    getAssignmentUsage,
  };
};
