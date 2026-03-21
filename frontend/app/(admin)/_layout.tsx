import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020B18' }} edges={['top']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="dashboard"
        />
        <Stack.Screen 
          name="categories" 
        />
        <Stack.Screen 
          name="products" 
        />
        <Stack.Screen 
          name="review" 
        />
        <Stack.Screen 
          name="users" 
        />
      </Stack>
    </SafeAreaView>
  );
}
