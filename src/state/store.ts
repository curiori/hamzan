import { asyncStorage } from "@/platform/storage";
import { createAppStore } from "./create-store";

export { activeProfile, type AppState } from "./create-store";

export const useAppStore = createAppStore(asyncStorage);
