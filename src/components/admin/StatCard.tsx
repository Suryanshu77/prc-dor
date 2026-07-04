import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  subtitle,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-lg">
      <div className="flex justify-between items-center">

        <div>

          <p className="text-sm text-muted-foreground">
            {title}
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-2 text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}

        </div>

        <div className="rounded-xl bg-gold/10 p-4 text-gold">
          {icon}
        </div>

      </div>
    </div>
  );
}