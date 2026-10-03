import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomTabInset } from '@/constants/theme';
import { workerNavigationItems, type WorkerNavigationKey } from '@/features/worker/worker-navigation';
import { WorkerIcon, WorkerText, workerColors } from '@/components/worker/worker-ui';

type WorkerScreenContainerProps = {
  activeNavigation: WorkerNavigationKey;
  children: React.ReactNode;
};

/** Persistent worker frame for assignment-safe operational destinations. */
export function WorkerScreenContainer({ activeNavigation, children }: WorkerScreenContainerProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.header}><WorkerText variant="headline">Turnify</WorkerText><WorkerText variant="label" color={workerColors.muted}>Operación de barbero</WorkerText></View>
      <View style={styles.content}>{children}</View>
      <View style={styles.navigation}>
        {workerNavigationItems.map((item) => {
          const active = item.key === activeNavigation;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPress={() => router.replace(item.href as Href)}
              style={({ pressed }) => [styles.navigationItem, { opacity: pressed ? 0.72 : 1 }]}
            >
              <WorkerIcon name={navigationIcons[item.key]} color={active ? workerColors.teal : workerColors.muted} size={20} />
              <WorkerText variant="eyebrow" color={active ? workerColors.teal : workerColors.muted} style={styles.navigationLabel}>{item.label}</WorkerText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const workerScreenStyles = StyleSheet.create({
  page: { gap: 20, paddingBottom: 32, paddingHorizontal: 16, paddingTop: 16 },
  card: { borderRadius: 8, borderWidth: 1, gap: 12, padding: 16 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, lineHeight: 14, textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.6, lineHeight: 34 },
  detail: { fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2, lineHeight: 24 },
});

const styles = StyleSheet.create({
  shell: { backgroundColor: workerColors.background, flex: 1 }, header: { alignItems: 'center', backgroundColor: '#FEF8F4EE', borderBottomColor: workerColors.outline, borderBottomWidth: 1, flexDirection: 'row', gap: 12, justifyContent: 'space-between', minHeight: 60, paddingHorizontal: 16, shadowColor: '#0E1E2E', shadowOpacity: .05, shadowRadius: 8 },
  content: { alignSelf: 'center', flex: 1, maxWidth: 640, width: '100%' },
  navigation: {
    alignSelf: 'center', backgroundColor: '#FEF8F4EE', borderColor: workerColors.outline, borderTopWidth: 1, flexDirection: 'row', maxWidth: 640,
    minHeight: 64 + BottomTabInset, paddingBottom: BottomTabInset, paddingHorizontal: 8, width: '100%',
  },
  navigationItem: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 64, paddingHorizontal: 2 },
  navigationLabel: { marginTop: 3 },
});

const navigationIcons: Record<WorkerNavigationKey, 'live' | 'queue' | 'history' | 'profile'> = { live: 'live', queue: 'queue', history: 'history', profile: 'profile' };
