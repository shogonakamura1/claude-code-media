"use client";

import { useEffect, useRef } from "react";

type AdFormat = "auto" | "fluid" | "rectangle" | "horizontal";

interface AdUnitProps {
  slot: string;
  format?: AdFormat;
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export function AdUnit({
  slot,
  format = "auto",
  responsive = true,
  className = "",
}: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not loaded (ad blocker, dev environment, etc.)
    }
  }, []);

  return (
    <div className={`ad-unit overflow-hidden text-center ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-1071130974712342"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
        ref={adRef}
      />
    </div>
  );
}

const INFEED_SLOT = process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT ?? "";
const DISPLAY_SLOT = process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT ?? "";

/** 記事フィード間に挿入するインフィード広告 */
export function InFeedAd({ className = "" }: { className?: string }) {
  if (!INFEED_SLOT) return null;
  return (
    <AdUnit
      slot={INFEED_SLOT}
      format="fluid"
      className={`my-6 ${className}`}
    />
  );
}

/** ページ下部に配置するディスプレイ広告 */
export function DisplayAd({ className = "" }: { className?: string }) {
  if (!DISPLAY_SLOT) return null;
  return (
    <AdUnit
      slot={DISPLAY_SLOT}
      format="auto"
      className={`my-8 ${className}`}
    />
  );
}
