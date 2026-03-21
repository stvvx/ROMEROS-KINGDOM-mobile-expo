import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020B18' }} edges={['top']}>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}
