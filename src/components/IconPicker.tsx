"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import DynamicIcon from "@/components/DynamicIcon";
import { ICON_OPTIONS, IconKey } from "@/lib/iconKeys";

type Props = {
  value: IconKey;
  onChange: (key: IconKey) => void;
  /** Describes what this icon is for, e.g. "Icon for the Products tab" */
  label: string;
};

/** A button that shows the current icon and opens a grid of choices. */
export default function IconPicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Close when tapping elsewhere or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-1 rounded-md border border-hairline bg-white px-2.5 text-ink hover:bg-canvas"
      >
        <DynamicIcon name={value} size={18} />
        <ChevronDown size={13} className="text-muted" />
      </button>

      {open && (
        <div
          role="group"
          aria-label="Choose an icon"
          className="absolute left-0 top-full z-30 mt-1 grid w-72 max-w-[calc(100vw-2rem)] grid-cols-6 gap-1 rounded-lg border border-hairline bg-surface p-2 shadow-lg"
        >
          {ICON_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              title={o.label}
              aria-label={o.label}
              aria-pressed={o.key === value}
              onClick={() => {
                onChange(o.key);
                setOpen(false);
              }}
              className={`flex h-10 items-center justify-center rounded-md ${
                o.key === value ? "bg-accent text-surface" : "text-ink hover:bg-canvas"
              }`}
            >
              <DynamicIcon name={o.key} size={18} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
