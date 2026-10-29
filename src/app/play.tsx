import { StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";

// Placeholder until the play screen is ported (plan B task 4).
export default function PlayRoute() {
  return (
    <View style={styles.root}>
      <AppText weight="bold">じゅんびちゅう</AppText>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" } });
