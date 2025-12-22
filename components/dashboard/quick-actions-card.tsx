"use client";

type QuickAction = {
  label: string;
  href: string;
};

type QuickActionsCardProps = {
  actions?: QuickAction[];
};

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: "View Plans", href: "#pricing" },
  { label: "Get Support", href: "#support" },
];

export function QuickActionsCard({
  actions = DEFAULT_ACTIONS,
}: QuickActionsCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="font-semibold mb-4">Quick Actions</h3>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <a
            key={index}
            href={action.href}
            className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors"
          >
            <span className="text-sm">{action.label}</span>
            <span className="text-primary">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
