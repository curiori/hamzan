import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Button } from "./button";
import { AppText } from "./text";
import { colors, radius } from "./theme";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Confirm = (o: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** Promise-based confirm dialog, same call shape as the web prototype's useConfirm. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((o) => {
    resolver.current?.(false);
    setOpen(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpen(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal transparent visible={!!open} animationType="fade" onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          <View style={styles.box} accessibilityViewIsModal onAccessibilityEscape={() => close(false)}>
            <AppText weight="bold" style={styles.title}>
              {open?.title}
            </AppText>
            {open?.description ? <AppText style={styles.desc}>{open.description}</AppText> : null}
            <View style={styles.actions}>
              <Button variant="outline" label={open?.cancelLabel ?? "キャンセル"} onPress={() => close(false)} style={styles.action} />
              <Button
                variant={open?.destructive ? "destructive" : "primary"}
                label={open?.confirmLabel ?? "OK"}
                onPress={() => close(true)}
                style={styles.action}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const c = useContext(ConfirmContext);
  if (!c) throw new Error("useConfirm needs ConfirmProvider");
  return c;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  box: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderRadius: radius.xl, padding: 20, gap: 10 },
  title: { fontSize: 18 },
  desc: { fontSize: 14 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  action: { flex: 1 },
});
