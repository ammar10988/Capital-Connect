---
name: tab-bar-scope-and-static-screens
description: Never conditionally render Tabs.Screen components; never make changes outside the explicitly requested scope
type: feedback
---

Do NOT conditionally render Tabs.Screen components with JSX ternaries or fragments. React Navigation requires all tab screens to be declared statically on every render. Use `tabBarButton: isFounder ? undefined : () => null` to show/hide tabs based on role instead.

**Why:** Conditional Tabs.Screen rendering (isFounder ? <> screens </> : <> other screens </>) caused React Navigation to register an unstable number of tabs, producing a chain of box characters in the tab bar for all auto-discovered screens that weren't explicitly configured. This was the root cause of the "multi-box chain" bug.

**How to apply:** Whenever working with expo-router Tabs, always declare every Tabs.Screen statically. Control visibility with tabBarButton: () => null (for always-hidden screens) or tabBarButton: condition ? undefined : () => null (for role-conditional screens). Never wrap Tabs.Screen in a conditional block.
