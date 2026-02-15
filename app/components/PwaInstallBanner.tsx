"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setVisible(false);
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 shadow-soft backdrop-blur">
      <div>
        <p className="text-sm font-semibold text-stone-800">홈 화면에 추가</p>
        <p className="text-xs text-stone-500">앱처럼 빠르게 사용할 수 있어요.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-600"
          onClick={() => setVisible(false)}
        >
          닫기
        </button>
        <button
          className="rounded-full bg-accent px-3.5 py-1.5 text-xs text-white"
          onClick={handleInstall}
        >
          추가
        </button>
      </div>
    </div>
  );
}
