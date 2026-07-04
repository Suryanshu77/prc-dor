import { ShieldCheck } from "lucide-react";

export default function AdminHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border px-8 py-5 bg-background/60 backdrop-blur-md">
      <div>
        <h1 className="text-3xl font-display font-bold">
          Admin Dashboard
        </h1>

        <p className="text-muted-foreground mt-1">
          Manage voting, players and platform settings
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2">
        <ShieldCheck className="h-5 w-5 text-gold" />

        <span className="text-sm font-medium">
          Administrator
        </span>
      </div>
    </header>
  );
}