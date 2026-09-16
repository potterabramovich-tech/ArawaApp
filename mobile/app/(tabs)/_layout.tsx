import { useEffect, useState } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/tokens';

const icons = {
  index: ['home-outline', 'home'],
  camera: ['add-circle-outline', 'add-circle'],
  profile: ['person-outline', 'person'],
} as const;

export default function TabsLayout() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSignedIn(Boolean(data.session));
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setSignedIn(Boolean(session));
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!ready) return null;
  if (!signedIn) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          height: 76,
          paddingTop: 10,
          backgroundColor: 'rgba(10,13,19,0.96)',
          borderTopColor: colors.line,
        },
        tabBarIcon: ({ focused, color }) => {
          const pair = icons[route.name as keyof typeof icons] ?? icons.index;
          return (
            <Ionicons
              name={pair[focused ? 1 : 0]}
              size={route.name === 'camera' ? 34 : 24}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="camera" options={{ title: 'Camera' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
