import { View } from 'react-native';
import { NativeTabs } from '@/src/design-system/components/NativeTabs';
import { TabsTopHeader } from '@/src/features/tabs/presentation/components/TabsTopHeader/TabsTopHeader';
import { BLACK_PRIMARY } from '@/src/design-system/tokens/colors';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: BLACK_PRIMARY }}>
      <TabsTopHeader />
      <View style={{ flex: 1 }}>
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
            name="search"
            options={{
              title: 'Support',
              tabBarIcon: () => ({ sfSymbol: 'questionmark.circle' }),
              role: 'search',
            }}
          />
        </NativeTabs>
      </View>
    </View>
  );
}
