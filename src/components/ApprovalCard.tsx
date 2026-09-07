import { useState } from "react";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PendingApproval } from "@/hooks/useRunStream";

interface ApprovalCardProps {
  request: PendingApproval;
  assignmentId: string;
  runId: string;
  onApprove: (
    approvalRequestId: string,
    approved: boolean,
    reason?: string,
  ) => Promise<void>;
  onResolved: (approved: boolean, reason?: string) => void;
}

type View = "pending" | "rejecting" | "submitting" | "resolved";

export const ApprovalCard = ({
  request,
  assignmentId,
  runId,
  onApprove,
  onResolved,
}: ApprovalCardProps) => {
  const [view, setView] = useState<View>(
    request.resolved ? "resolved" : "pending",
  );
  const [reason, setReason] = useState("");
  const [argsOpen, setArgsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If resolved externally (e.g. via SSE event), reflect that state
  const isResolved = request.resolved || view === "resolved";
  const resolvedApproved = request.approved;

  const handleApprove = async () => {
    setView("submitting");
    setError(null);
    try {
      await onApprove(request.approval_request_id, true);
      onResolved(true);
      setView("resolved");
    } catch {
      setError("Failed to submit approval. Please try again.");
      setView("pending");
    }
  };

  const handleReject = async () => {
    setView("submitting");
    setError(null);
    try {
      await onApprove(request.approval_request_id, false, reason || undefined);
      onResolved(false, reason || undefined);
      setView("resolved");
    } catch {
      setError("Failed to submit rejection. Please try again.");
      setView("rejecting");
    }
  };

  if (isResolved) {
    return (
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm ${
          resolvedApproved
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
        }`}
      >
        {resolvedApproved ? (
          <CheckCircle className="w-4 h-4 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 shrink-0" />
        )}
        <span className="font-medium">
          {resolvedApproved ? "Approved" : "Rejected"}:
        </span>
        <span className="font-mono text-xs">{request.tool_name}</span>
        {!resolvedApproved && request.reason && (
          <span className="text-xs opacity-75 ml-1">— {request.reason}</span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
          Approval Required
        </span>
      </div>

      {/* Tool name + args */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Tool:</span>
          <span className="font-mono font-medium">{request.tool_name}</span>
        </div>

        {Object.keys(request.tool_args).length > 0 && (
          <Collapsible open={argsOpen} onOpenChange={setArgsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {argsOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              {argsOpen ? "Hide arguments" : "Show arguments"}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-1.5 p-2 rounded bg-muted text-xs overflow-auto max-h-32 font-mono">
                {JSON.stringify(request.tool_args, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Error message */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Actions */}
      {view === "pending" && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleApprove}
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/50 text-red-600 hover:bg-red-500/10 dark:text-red-400"
            onClick={() => setView("rejecting")}
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Reject
          </Button>
        </div>
      )}

      {view === "rejecting" && (
        <div className="space-y-2">
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-sm min-h-[60px] resize-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" onClick={handleReject}>
              Confirm Rejection
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setView("pending");
                setReason("");
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {view === "submitting" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Submitting decision…
        </div>
      )}
    </div>
  );
};
