import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="ProductDetails" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="cart" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="checkout" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="review" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="orders" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="UserProfile"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
