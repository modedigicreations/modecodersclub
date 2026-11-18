"use client";

import { useCallback, useEffect, useState } from "react";

// Reads text aloud with the browser's built-in voice (free, works offline on
// most phones). Prefers an English voice from Nigeria, then UK/US.

const AUTO_KEY = "mcc-tutor-autoread";

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [autoRead, setAutoReadState] = useState(true);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // Browser-only capability, known after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);
    try {
      setAutoReadState(localStorage.getItem(AUTO_KEY) !== "off");
    } catch {
      /* storage blocked */
    }
    const choose = () => {
      const voices = window.speechSynthesis.getVoices();
      const byLang = (re: RegExp) => voices.find((v) => re.test(v.lang));
      setVoice(byLang(/^en-NG/i) ?? byLang(/^en-GB/i) ?? byLang(/^en-US/i) ?? byLang(/^en/i) ?? null);
    };
    choose();
    window.speechSynthesis.addEventListener("voiceschanged", choose);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", choose);
      window.speechSynthesis.cancel(); // stop talking when the learner leaves the page
    };
  }, []);

  const speak = useCallback(
    (text: string | undefined) => {
      if (!supported || !text) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-GB";
      u.rate = 0.85;
      synth.speak(u);
    },
    [supported, voice],
  );

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const setAutoRead = useCallback((on: boolean) => {
    setAutoReadState(on);
    try {
      localStorage.setItem(AUTO_KEY, on ? "on" : "off");
    } catch {
      /* ignore */
    }
  }, []);

  return { supported, speak, stop, autoRead, setAutoRead };
}
