import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="dashboard"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="categories" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="products" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="review" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="users" 
        options={{ headerShown: false }} 
      />
    </Stack>
  );
}
