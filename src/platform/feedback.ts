import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

// Short sounds and haptics; both can be switched off by a parent. Failures never reach the caller.

export type Cue = "ok" | "miss" | "clear";

const SOURCES: Record<Cue, number> = {
  ok: require("../../assets/sounds/ok.wav"),
  miss: require("../../assets/sounds/miss.wav"),
  clear: require("../../assets/sounds/clear.wav"),
};

const players: Partial<Record<Cue, AudioPlayer>> = {};
let audioModeSet = false;

function playerFor(kind: Cue): AudioPlayer {
  if (!audioModeSet) {
    audioModeSet = true;
    // never stop the music another app is playing, and stay quiet when the silent switch is on
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
  }
  players[kind] ??= createAudioPlayer(SOURCES[kind]);
  return players[kind];
}

function playSound(kind: Cue) {
  try {
    const player = playerFor(kind);
    player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => {});
  } catch {
    // audio unavailable
  }
}

function vibrate(kind: Cue) {
  const done =
    kind === "ok"
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Haptics.notificationAsync(kind === "miss" ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
  done.catch(() => {});
}

export function cue(kind: Cue, opts: { sound: boolean; vibration: boolean }): void {
  if (opts.sound) playSound(kind);
  if (opts.vibration) {
    try {
      vibrate(kind);
    } catch {
      // haptics unavailable
    }
  }
}
