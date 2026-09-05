import { useContext, useCallback } from "react";
import { AuthContext } from "@/auth/authcontext";
import axios from "axios";
import logger from "@/lib/logger";

const log = logger.child("ChatbotAPI");

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
const getEnvVar = (key: keyof Window["ENV"]): string => {
  return window.ENV?.[key] || import.meta.env[key] || "";
};

// Create a dedicated axios instance for chatbot API
const chatbotAxios = axios.create({
  baseURL: getEnvVar("VITE_API_URL"),
  headers: {
    "Content-Type": "application/json",
  },
});

// Chat interface matching the API response format
export interface ChatResponse {
  id: number;
  title: string;
  summary: string;
  username: string;
  modelId: number;
  createdAt: string;
  updatedAt: string;
}

// Internal chat representation for state management
export interface Chat {
  id: number;
  title: string;
  summary: string;
  username: string;
  modelId: number;
  createdAt: Date;
  updatedAt: Date;
}

// Message interface matching the API response format
export interface MessageResponse {
  id: number;
  messageGroupId: string;
  role: string;
  content: string;
  chatId: number;
  username: string;
  createdAt: string;
  updatedAt: string;
}

// Internal message representation for state management
export interface Message {
  id: number;
  messageGroupId: string;
  role: string;
  content: string;
  chatId: number;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for update chat request body
export interface UpdateChatRequest {
  title: string;
  summary: string;
}

// Interface for create message request body
export interface CreateMessageRequest {
  role: string;
  content: string;
}

// Interface for create chat request body
export interface CreateChatRequest {
  title: string;
  modelId: string;
  summary: string;
  username: string;
}

export const useChatbotApi = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("useChatbotApi must be used within AuthProvider");
  }

  const getAllChats = useCallback(async (): Promise<Chat[]> => {
    log.info("Retrieving all chats for user...");

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Get the current token from authTokens
        const token = authContext.authTokens?.access;
        if (!token) {
          throw new Error("No authentication token available");
        }

        const response = await chatbotAxios.get<ChatResponse[]>("/chats", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-auth-request-access-token": token,
          },
        });

        log.info("Chats retrieved successfully:", {
          count: response.data.length,
          attempt: retryCount + 1,
        });

        // Convert API response to internal Chat format
        const chats: Chat[] = response.data.map((chatResponse) => ({
          id: chatResponse.id,
          title: chatResponse.title,
          summary: chatResponse.summary,
          username: chatResponse.username,
          modelId: chatResponse.modelId,
          createdAt: new Date(chatResponse.createdAt),
          updatedAt: new Date(chatResponse.updatedAt),
        }));

        return chats;
      } catch (error) {
        retryCount++;
        log.error(
          `Error retrieving chats (attempt ${retryCount}/${maxRetries}):`,
          error,
        );

        if (retryCount >= maxRetries) {
          log.error("Max retries reached for getAllChats");
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error("Failed to retrieve chats after maximum retries");
  }, [authContext.authTokens?.access]); // Only recreate if the access token changes

  const getChatById = useCallback(
    async (chatId: number): Promise<Chat> => {
      log.info(`Retrieving chat with ID: ${chatId}`);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Get the current token from authTokens
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          const response = await chatbotAxios.get<ChatResponse>(
            `/chats/${chatId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-auth-request-access-token": token,
              },
            },
          );

          log.info("Chat retrieved successfully:", {
            chatId,
            attempt: retryCount + 1,
            data: response.data,
          });

          // Convert API response to internal Chat format
          const chat: Chat = {
            id: response.data.id,
            title: response.data.title,
            summary: response.data.summary,
            username: response.data.username,
            modelId: response.data.modelId,
            createdAt: new Date(response.data.createdAt),
            updatedAt: new Date(response.data.updatedAt),
          };

          return chat;
        } catch (error) {
          retryCount++;
          log.error(
            `Error retrieving chat (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for getChatById");
            throw error;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      // This should never be reached, but TypeScript requires it
      throw new Error("Failed to retrieve chat after maximum retries");
    },
    [authContext.authTokens?.access],
  ); // Only recreate if the access token changes

  const getAllMessagesByChat = useCallback(
    async (chatId: number): Promise<Message[]> => {
      log.info(`Retrieving all messages for chat ID: ${chatId}`);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Get the current token from authTokens
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          const response = await chatbotAxios.get<MessageResponse[]>(
            `/chats/${chatId}/messages`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-auth-request-access-token": token,
              },
            },
          );

          log.info("Messages retrieved successfully:", {
            chatId,
            count: response.data.length,
            attempt: retryCount + 1,
          });

          // Convert API response to internal Message format
          const messages: Message[] = response.data.map((messageResponse) => ({
            id: messageResponse.id,
            messageGroupId: messageResponse.messageGroupId,
            role: messageResponse.role,
            content: messageResponse.content,
            chatId: messageResponse.chatId,
            username: messageResponse.username,
            createdAt: new Date(messageResponse.createdAt),
            updatedAt: new Date(messageResponse.updatedAt),
          }));

          return messages;
        } catch (error) {
          retryCount++;
          log.error(
            `Error retrieving messages (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for getAllMessagesByChat");
            throw error;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      // This should never be reached, but TypeScript requires it
      throw new Error("Failed to retrieve messages after maximum retries");
    },
    [authContext.authTokens?.access],
  ); // Only recreate if the access token changes

  const createChat = useCallback(
    async (chatData: CreateChatRequest): Promise<Chat> => {
      log.info("Creating new chat:", chatData);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Get the current token from authTokens
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          const response = await chatbotAxios.post<ChatResponse>(
            "/chats",
            chatData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-auth-request-access-token": token,
              },
            },
          );

          log.info("Chat created successfully:", {
            attempt: retryCount + 1,
            data: response.data,
          });

          // Convert API response to internal Chat format
          const chat: Chat = {
            id: response.data.id,
            title: response.data.title,
            summary: response.data.summary,
            username: response.data.username,
            modelId: response.data.modelId,
            createdAt: new Date(response.data.createdAt),
            updatedAt: new Date(response.data.updatedAt),
          };

          return chat;
        } catch (error) {
          retryCount++;
          log.error(
            `Error creating chat (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for createChat");
            throw error;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      // This should never be reached, but TypeScript requires it
      throw new Error("Failed to create chat after maximum retries");
    },
    [authContext.authTokens?.access],
  ); // Only recreate if the access token changes

  const createMessage = useCallback(
    async (
      chatId: number,
      messageData: CreateMessageRequest,
    ): Promise<Message> => {
      log.info(`Creating message for chat ID: ${chatId}`, messageData);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Get the current token from authTokens
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          const response = await chatbotAxios.post<MessageResponse>(
            `/chats/${chatId}/messages`,
            messageData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-auth-request-access-token": token,
              },
            },
          );

          log.info("Message created successfully:", {
            chatId,
            attempt: retryCount + 1,
            data: response.data,
          });

          // Convert API response to internal Message format
          const message: Message = {
            id: response.data.id,
            messageGroupId: response.data.messageGroupId,
            role: response.data.role,
            content: response.data.content,
            chatId: response.data.chatId,
            username: response.data.username,
            createdAt: new Date(response.data.createdAt),
            updatedAt: new Date(response.data.updatedAt),
          };

          return message;
        } catch (error) {
          retryCount++;
          log.error(
            `Error creating message (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for createMessage");
            throw error;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      // This should never be reached, but TypeScript requires it
      throw new Error("Failed to create message after maximum retries");
    },
    [authContext.authTokens?.access],
  );

  const updateChat = useCallback(
    async (chatId: number, updateData: UpdateChatRequest): Promise<Chat> => {
      log.info(`Updating chat with ID: ${chatId}`, updateData);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Get the current token from authTokens
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          const response = await chatbotAxios.put<ChatResponse>(
            `/chats/${chatId}`,
            updateData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-auth-request-access-token": token,
              },
            },
          );

          log.info("Chat updated successfully:", {
            chatId,
            attempt: retryCount + 1,
            updatedData: response.data,
          });

          // Convert API response to internal Chat format
          const updatedChat: Chat = {
            id: response.data.id,
            title: response.data.title,
            summary: response.data.summary,
            username: response.data.username,
            modelId: response.data.modelId,
            createdAt: new Date(response.data.createdAt),
            updatedAt: new Date(response.data.updatedAt),
          };

          return updatedChat;
        } catch (error) {
          retryCount++;
          log.error(
            `Error updating chat (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for updateChat");
            throw error;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }

      // This should never be reached, but TypeScript requires it
      throw new Error("Failed to update chat after maximum retries");
    },
    [authContext.authTokens?.access],
  ); // Only recreate if the access token changes

  const deleteChat = useCallback(
    async (chatId: number): Promise<void> => {
      log.info(`Deleting chat with ID: ${chatId}`);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Get the current token from authTokens
          const token = authContext.authTokens?.access;
          if (!token) {
            throw new Error("No authentication token available");
          }

          await chatbotAxios.delete(`/chats/${chatId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-auth-request-access-token": token,
            },
          });

          log.info("Chat deleted successfully:", {
            chatId,
            attempt: retryCount + 1,
          });

          return;
        } catch (error) {
          retryCount++;
          log.error(
            `Error deleting chat (attempt ${retryCount}/${maxRetries}):`,
            error,
          );

          if (retryCount >= maxRetries) {
            log.error("Max retries reached for deleteChat");
            throw error;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
        }
      }
    },
    [authContext.authTokens?.access],
  ); // Only recreate if the access token changes

  return {
    getAllChats,
    getChatById,
    getAllMessagesByChat,
    deleteChat,
    updateChat,
    createMessage,
    createChat,
  };
};

export default chatbotAxios;
