import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";

/** AsyncStorage as a zustand StateStorage. Read errors propagate so the store can tell "unreadable" from "empty";
 * write failures keep the app running in memory. */
export const asyncStorage: StateStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // storage unavailable: keep going in memory
    }
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // storage unavailable
    }
  },
};
