import React from "react";
import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useAuthStore } from "@/store/auth";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  focused: boolean;
}) {
  return <Ionicons size={24} name={props.name} color={props.color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { token, logout } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!token) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].primary,
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].textLight,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].surface,
          borderTopWidth: 1,
          borderTopColor: Colors[colorScheme ?? "light"].border,
          minHeight: Platform.OS === "android" ? 60 : 80,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 12 : 20),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].surface,
        },
        headerTintColor: Colors[colorScheme ?? "light"].text,
        headerTitleStyle: { fontWeight: "800" },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => {
              logout();
              router.replace("/");
            }}
            style={{ paddingHorizontal: 12 }}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={Colors[colorScheme ?? "light"].text}
            />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="wizard"
        options={{
          title: "Pratik Şef",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "sparkles" : "sparkles-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my-recipes"
        options={{
          title: "Tariflerim",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "book" : "book-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
