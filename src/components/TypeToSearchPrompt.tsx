import { Search } from "lucide-react";

/**
 * Shown instead of a list until the person starts typing in the search box,
 * so no client details are displayed on screen by default.
 */
export default function TypeToSearchPrompt({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-14 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 text-muted">
        <Search size={18} />
      </span>
      <p className="text-sm font-medium text-ink">Details are hidden</p>
      <p className="max-w-xs text-sm text-muted">{text}</p>
    </div>
  );
}
