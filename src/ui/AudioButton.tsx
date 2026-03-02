import { useEffect, useRef, useState } from "react";
import { ActionIcon } from "@mantine/core";

interface AudioButtonProps {
  url: string;
  size?: string;
}

export default function AudioButton({ url, size = "sm" }: AudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(url);
    const onEnd = () => setPlaying(false);
    const onErr = () => setPlaying(false);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onErr);
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onErr);
      audioRef.current = null;
    };
  }, [url]);

  function toggle() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => setPlaying(false));
    }
  }

  return (
    <ActionIcon
      variant="subtle"
      size={size}
      onClick={toggle}
      aria-label="Play audio"
      color={playing ? "blue" : "gray"}
    >
      {playing ? "\u23F9" : "\u25B6"}
    </ActionIcon>
  );
}
