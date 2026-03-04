import { NativeTabs } from '@/src/design-system/components/NativeTabs';

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: () => ({ sfSymbol: 'bubble.left.and.bubble.right' }),
        }}
      />
      <NativeTabs.Screen
        name="models"
        options={{
          title: 'Models',
          tabBarIcon: () => ({ sfSymbol: 'cpu' }),
        }}
      />
      <NativeTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => ({ sfSymbol: 'person.circle' }),
        }}
      />
      <NativeTabs.Screen
        name="search"
        options={{
          title: 'Support',
          tabBarIcon: () => ({ sfSymbol: 'questionmark.circle' }),
          role: 'search',
        }}
      />
    </NativeTabs>
  );
}
