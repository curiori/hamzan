import { AccessibilityInfo, Platform } from "react-native";

// What VoiceOver should say about something that appears without the focus moving to it.

let webRegion: HTMLElement | null = null;

/** A polite live region, so screen readers on the web hear the same news. */
function region(): HTMLElement {
  if (!webRegion) {
    webRegion = document.createElement("div");
    webRegion.setAttribute("role", "status");
    webRegion.setAttribute("aria-live", "polite");
    webRegion.setAttribute("aria-atomic", "true");
    Object.assign(webRegion.style, { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" });
    document.body.appendChild(webRegion);
  }
  return webRegion;
}

/**
 * Reads `text` out (when VoiceOver is on), after what it is saying about the focus rather than over it, e.g. the
 * question that takes the place of the button just pressed. Failures are ignored.
 */
export function announce(text: string): void {
  try {
    if (Platform.OS === "web") {
      const el = region();
      // emptied first, so the same words twice are said twice
      el.textContent = "";
      setTimeout(() => (el.textContent = text), 50);
    } else AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: true });
  } catch {
    // accessibility unavailable
  }
}
