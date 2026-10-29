import { StyleSheet, Text, View } from 'react-native';

export default function RoomScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>おへや</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  title: { fontSize: 28, fontWeight: '800' },
});
