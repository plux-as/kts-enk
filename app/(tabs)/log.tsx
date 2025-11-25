
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { ChecklistSession } from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LogScreen() {
  const [sessions, setSessions] = useState<ChecklistSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      loadSessions();
    }, [])
  );

  const loadSessions = async () => {
    try {
      const data = await storage.getSessions();
      setSessions(data);
      console.log('Sessions loaded:', data.length);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const handleViewSession = (session: ChecklistSession) => {
    router.push({
      pathname: '/log-detail',
      params: { sessionId: session.id },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={[styles.text, { fontFamily: bodyFont }]}>Laster...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={commonStyles.navBar}>
          <Text style={commonStyles.navBarTitle}>Logg</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="list.bullet" color={colors.textSecondary} size={64} />
              <Text style={styles.emptyText}>Ingen økter registrert</Text>
              <Text style={[styles.emptySubtext, { fontFamily: bodyFont }]}>
                Start en ny KTS-økt fra hjemmeskjermen
              </Text>
            </View>
          ) : (
            sessions.map(session => {
              const missingCount = session.data.reduce((count, item) => {
                return count + item.statuses.filter(s => s.status === 'missing').length;
              }, 0);

              return (
                <Pressable
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => handleViewSession(session)}
                >
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTitle}>
                      KTS {session.date} {session.time}
                    </Text>
                  </View>
                  <View style={styles.sessionStats}>
                    <View style={styles.statItem}>
                      <IconSymbol name="person.fill" color={colors.accent} size={20} />
                      <Text style={[styles.statText, { fontFamily: bodyFont }]}>{session.soldiers.length} soldater</Text>
                    </View>
                    {session.duration && (
                      <View style={styles.statItem}>
                        <IconSymbol name="stopwatch.fill" color={colors.accent} size={20} />
                        <Text style={[styles.statText, { fontFamily: bodyFont }]}>{session.duration}</Text>
                      </View>
                    )}
                    <View style={styles.statItem}>
                      <IconSymbol
                        name={missingCount > 0 ? "xmark" : "checkmark.circle.fill"}
                        color={missingCount > 0 ? colors.error : colors.primary}
                        size={20}
                      />
                      <Text style={[styles.statText, { fontFamily: bodyFont }]}>{missingCount} mangler</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 100,
  },
  text: {
    fontSize: 18,
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  emptySubtext: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
  },
  sessionHeader: {
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 16,
    color: colors.text,
  },
});
