import { StyleSheet, View } from 'react-native';
import { AppText } from '@/ui/text';
import { colors } from '@/ui/theme';

// The shop arrives with the seed economy (phase 5).
export default function ShopScreen() {
  return (
    <View style={styles.root}>
      <AppText weight="bold" style={styles.text}>
        もうすぐ ひらくよ
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  text: { fontSize: 20 },
});
