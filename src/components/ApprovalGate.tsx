import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useApproval } from "@/lib/use-approval";
import { useAuth } from "@/lib/auth";
import { Ban, Clock, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

/**
 * Client-side UX gate for pending / rejected voters. The ballot RPCs enforce
 * the same rules server-side — this component is presentation only.
 * Admins always pass (mirrors private.has_role bypass in SQL).
 */
export function ApprovalGate({ children }: Props) {
  const { signOut } = useAuth();
  const { status, rejectionReason, loading, error, refetch } = useApproval();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin text-gold" />
        <p className="text-sm">Checking your account status…</p>
      </div>
    );
  }

  if (error || status === null) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <Ban className="h-10 w-10 text-destructive" />
        <h1 className="font-display text-3xl">Couldn't verify your account</h1>
        <p className="text-sm text-muted-foreground">
          We couldn't confirm your registration status. Try again — if this
          keeps happening, contact an administrator.
        </p>
        <div className="flex gap-2">
          <Button onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Clock className="h-7 w-7" />
        </span>
        <h1 className="font-display text-3xl">Waiting for approval</h1>
        <p className="text-sm text-muted-foreground">
          Your registration is pending admin approval. Site access and voting
          open once an administrator approves your account.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Check again
          </Button>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <Ban className="h-7 w-7" />
        </span>
        <h1 className="font-display text-3xl">Account not approved</h1>
        <p className="text-sm text-muted-foreground">
          {rejectionReason ??
            "This account has been declined by an administrator and cannot vote."}
        </p>
        <p className="text-xs text-muted-foreground">
          If you believe this is a mistake, contact an administrator.
        </p>
        <Button variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    );
  }

  // approved (or admin — useApproval short-circuits admins to approved)
  return <>{children}</>;
}
