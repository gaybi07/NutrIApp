"use client";

import { useEffect, useRef, useState } from "react";

// SpeechRecognition no está tipado en TS DOM lib estándar.
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | undefined {
  return (
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition
  );
}

/**
 * Dictado por voz (Web Speech API), compartido por cualquier textarea que
 * quiera un botón de "grabar audio" — hoy lo usan la carga de comidas con
 * IA y el alta de productos de compras. "continuous" evita que el
 * reconocimiento se corte solo apenas detecta un segundo de silencio.
 */
export function useSpeechToText(onResult: (transcript: string) => void, onError?: () => void) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const toggle = () => {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += `${event.results[i][0].transcript} `;
      }
      finalTranscript = finalTranscript.trim();
      if (finalTranscript) onResult(finalTranscript);
    };
    recognition.onerror = () => {
      setRecording(false);
      onError?.();
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  return { supported, recording, toggle };
}
