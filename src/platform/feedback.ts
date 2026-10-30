import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

// Short sounds and haptics; both can be switched off by a parent. Failures never reach the caller.

export type Cue = "ok" | "miss" | "clear";

const SOURCES: Record<Cue, number> = {
  ok: require("../../assets/sounds/ok.wav"),
  miss: require("../../assets/sounds/miss.wav"),
  clear: require("../../assets/sounds/clear.wav"),
};
/** the room piano's keys, low to high */
const NOTES: number[] = [
  require("../../assets/sounds/key1.wav"),
  require("../../assets/sounds/key2.wav"),
  require("../../assets/sounds/key3.wav"),
  require("../../assets/sounds/key4.wav"),
  require("../../assets/sounds/key5.wav"),
];

const players = new Map<number, AudioPlayer>();
let audioModeSet = false;

function playerFor(source: number): AudioPlayer {
  if (!audioModeSet) {
    audioModeSet = true;
    // never stop the music another app is playing, and stay quiet when the silent switch is on
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
  }
  let player = players.get(source);
  if (!player) {
    player = createAudioPlayer(source);
    players.set(source, player);
  }
  return player;
}

function playSound(source: number) {
  try {
    const player = playerFor(source);
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
  if (opts.sound) playSound(SOURCES[kind]);
  if (opts.vibration) {
    try {
      vibrate(kind);
    } catch {
      // haptics unavailable
    }
  }
}

/** A light tap in the hand, e.g. when the child touches the hamster. */
export function tapFeel(vibration: boolean): void {
  if (!vibration) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    // haptics unavailable
  }
}

/** Loads the sounds ahead of the first answer, so the first cue is not late. */
export function preloadCues(): void {
  try {
    Object.values(SOURCES).forEach(playerFor);
  } catch {
    // audio unavailable
  }
}

/** One of the room piano's keys (0 is the lowest), when sounds are on. */
export function playNote(key: number, sound: boolean): void {
  if (sound) playSound(NOTES[Math.min(NOTES.length - 1, Math.max(0, key))]);
}

/** Loads the piano's keys ahead of the first note, so it is not late. */
export function preloadNotes(): void {
  try {
    NOTES.forEach(playerFor);
  } catch {
    // audio unavailable
  }
}
