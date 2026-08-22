import { useState, useEffect, useCallback, useRef } from "react";
import { Wifi, WifiOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authStore } from "@/lib/authStore";

type ConnectionState = "connected" | "disconnected" | "checking";

interface ConnectionStatusProps {
  checkInterval?: number; // in milliseconds
  enablePolling?: boolean; // whether to auto-poll
}

export const ConnectionStatus = ({ 
  checkInterval = 30000, 
  enablePolling = false // Disabled by default to prevent CORS spam
}: ConnectionStatusProps) => {
  const [status, setStatus] = useState<ConnectionState>("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const maxConsecutiveFailures = 3;

  const checkConnection = useCallback(async () => {
    // Get Ollama URL
    const ollamaUrl = window.ENV?.VITE_OLLAMA_API_URL || import.meta.env.VITE_OLLAMA_API_URL;
    
    if (!ollamaUrl) {
      setStatus("disconnected");
      setLastChecked(new Date());
      return;
    }

    setStatus("checking");
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Get auth token if available
      const token = authStore.getToken();
      
      // Build headers with auth if available
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-auth-request-access-token'] = token;
      }

      // Use redirect: "manual" to prevent following redirects to Keycloak
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
        redirect: "manual", // Don't follow redirects
        headers,
      });
      
      clearTimeout(timeoutId);
      
      // Check for redirect response (type will be "opaqueredirect" or status 0)
      if (response.type === "opaqueredirect" || response.status === 0) {
        // This means oauth2-proxy is redirecting to Keycloak - treat as disconnected
        setStatus("disconnected");
        consecutiveFailuresRef.current++;
      } else if (response.ok) {
        setStatus("connected");
        consecutiveFailuresRef.current = 0; // Reset on success
      } else {
        setStatus("disconnected");
        consecutiveFailuresRef.current++;
      }
    } catch {
      // Network error, timeout, or abort - silently set disconnected
      setStatus("disconnected");
      consecutiveFailuresRef.current++;
    }
    
    setLastChecked(new Date());
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Polling interval (only if enabled and not too many failures)
  useEffect(() => {
    if (!enablePolling) return;
    
    // Stop polling after too many consecutive failures
    if (consecutiveFailuresRef.current >= maxConsecutiveFailures) {
      return;
    }

    const interval = setInterval(() => {
      // Check failure count before each poll
      if (consecutiveFailuresRef.current < maxConsecutiveFailures) {
        checkConnection();
      }
    }, checkInterval);
    
    return () => clearInterval(interval);
  }, [checkConnection, checkInterval, enablePolling]);

  const handleManualCheck = () => {
    // Reset failure count on manual check
    consecutiveFailuresRef.current = 0;
    checkConnection();
  };

  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          icon: Wifi,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          label: "Connected",
          description: "API is reachable",
        };
      case "disconnected":
        return {
          icon: WifiOff,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          label: "Disconnected",
          description: "Cannot reach API",
        };
      case "checking":
        return {
          icon: AlertCircle,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          label: "Checking...",
          description: "Verifying connection",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleManualCheck}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
              config.bgColor,
              config.color,
              "hover:opacity-80 cursor-pointer"
            )}
          >
            <Icon size={14} className={status === "checking" ? "animate-pulse" : ""} />
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
          {lastChecked && (
            <p className="text-xs text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Click to refresh</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
