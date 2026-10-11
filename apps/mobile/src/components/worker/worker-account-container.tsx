import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark, Icon } from '@/components/ui';
import { BottomTabInset, Palette, Shadows, space } from '@/constants/theme';
import { accountNavigationItems, type WorkerAccountNavigationKey } from '@/features/worker/worker-account-navigation';
import { WorkerText, workerColors } from '@/components/worker/worker-ui';

type WorkerAccountContainerProps = {
  activeNavigation: WorkerAccountNavigationKey;
  children: React.ReactNode;
};

/** Account frame for choosing barberías and editing the worker profile. */
export function WorkerAccountContainer({ activeNavigation, children }: WorkerAccountContainerProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.shell}>
      <View style={styles.header}>
        <View accessibilityLabel="Turnify" style={styles.identity}>
          <BrandMark size={30} tile />
          <View style={styles.identityText}>
            <WorkerText variant="headline">Turnify</WorkerText>
            <WorkerText color={workerColors.muted} variant="eyebrow">Cuenta de trabajador</WorkerText>
          </View>
        </View>
      </View>
      <View style={styles.content}>{children}</View>
      <View style={styles.navigation}>
        {accountNavigationItems.map((item) => {
          const active = item.key === activeNavigation;
          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.key}
              onPress={() => router.replace(item.href as Href)}
              style={({ pressed }) => [styles.navigationItem, { opacity: pressed ? 0.72 : 1 }]}
            >
              <Icon color={active ? Palette.brand : Palette.inkFaint} name={item.key === 'shops' ? 'storefront' : 'user'} size={20} />
              <WorkerText color={active ? Palette.brand : Palette.inkFaint} style={styles.navigationLabel} variant="eyebrow">
                {item.label}
              </WorkerText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: workerColors.background, flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderBottomColor: Palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 60,
    paddingHorizontal: space(4),
    ...Shadows.card,
  },
  identity: { alignItems: 'center', flexDirection: 'row', gap: space(2.5) },
  identityText: { gap: 1 },
  content: { alignSelf: 'center', flex: 1, maxWidth: 640, width: '100%' },
  navigation: {
    alignSelf: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    maxWidth: 640,
    minHeight: 64 + BottomTabInset,
    paddingBottom: BottomTabInset,
    paddingHorizontal: space(2),
    width: '100%',
  },
  navigationItem: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 64, paddingHorizontal: space(1) },
  navigationLabel: { marginTop: 3 },
});
