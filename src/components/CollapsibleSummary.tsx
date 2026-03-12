"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  summary: string;
  defaultOpen?: boolean;
};

export function CollapsibleSummary({ summary, defaultOpen = false }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [summary]);

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span
          className="inline-block transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
        AI要約を{isOpen ? "閉じる" : "見る"}
      </button>
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        style={{
          maxHeight: isOpen ? `${height}px` : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div ref={contentRef}>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
}
