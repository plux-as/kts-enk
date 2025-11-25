
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { ChecklistSession, ChecklistCategory } from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LogDetailScreen() {
  const { sessionId } = useLocalSearchParams();
  const [session, setSession] = useState<ChecklistSession | null>(null);
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<{
    soldierId: string;
    categoryId: string;
    itemId: string;
    description: string;
  } | null>(null);
  const [descriptionText, setDescriptionText] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessions, checklistData] = await Promise.all([
        storage.getSessions(),
        storage.getChecklist(),
      ]);

      const foundSession = sessions.find(s => s.id === sessionId);
      if (foundSession) {
        setSession(foundSession);
      }
      setChecklist(checklistData);
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDescription = (
    soldierId: string,
    categoryId: string,
    itemId: string,
    currentDescription?: string
  ) => {
    setEditingItem({ soldierId, categoryId, itemId, description: currentDescription || '' });
    setDescriptionText(currentDescription || '');
  };

  const handleSaveDescription = async () => {
    if (!editingItem || !session) return;

    try {
      const sessions = await storage.getSessions();
      const sessionIndex = sessions.findIndex(s => s.id === session.id);

      if (sessionIndex !== -1) {
        const updatedSession = { ...sessions[sessionIndex] };
        const dataIndex = updatedSession.data.findIndex(
          d => d.categoryId === editingItem.categoryId && d.itemId === editingItem.itemId
        );

        if (dataIndex !== -1) {
          const statusIndex = updatedSession.data[dataIndex].statuses.findIndex(
            s => s.soldierId === editingItem.soldierId
          );

          if (statusIndex !== -1) {
            updatedSession.data[dataIndex].statuses[statusIndex] = {
              ...updatedSession.data[dataIndex].statuses[statusIndex],
              description: descriptionText.trim(),
            };
          }
        }

        sessions[sessionIndex] = updatedSession;
        await storage.saveSessions(sessions);
        setSession(updatedSession);
        setEditingItem(null);
        setDescriptionText('');
      }
    } catch (error) {
      console.error('Error saving description:', error);
      Alert.alert('Feil', 'Kunne ikke lagre beskrivelsen');
    }
  };

  const handleMarkAsOk = async (
    soldierId: string,
    categoryId: string,
    itemId: string
  ) => {
    if (!session) return;

    try {
      const sessions = await storage.getSessions();
      const sessionIndex = sessions.findIndex(s => s.id === session.id);

      if (sessionIndex !== -1) {
        const updatedSession = { ...sessions[sessionIndex] };
        const dataIndex = updatedSession.data.findIndex(
          d => d.categoryId === categoryId && d.itemId === itemId
        );

        if (dataIndex !== -1) {
          const statusIndex = updatedSession.data[dataIndex].statuses.findIndex(
            s => s.soldierId === soldierId
          );

          if (statusIndex !== -1) {
            updatedSession.data[dataIndex].statuses[statusIndex] = {
              ...updatedSession.data[dataIndex].statuses[statusIndex],
              status: 'fulfilled',
            };
          }
        }

        sessions[sessionIndex] = updatedSession;
        await storage.saveSessions(sessions);
        setSession(updatedSession);
      }
    } catch (error) {
      console.error('Error marking as ok:', error);
      Alert.alert('Feil', 'Kunne ikke oppdatere status');
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={[styles.fullScreenModal, { paddingTop: insets.top }]}>
          <View style={commonStyles.modalNavBar}>
            <View style={{ width: 24 }} />
            <Text style={commonStyles.modalNavBarTitle}>Detaljer og utbedringer</Text>
            <Pressable onPress={() => router.back()}>
              <IconSymbol name="xmark" color={colors.error} size={24} />
            </Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[styles.text, { fontFamily: bodyFont }]}>Laster...</Text>
          </View>
        </View>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={[styles.fullScreenModal, { paddingTop: insets.top }]}>
          <View style={commonStyles.modalNavBar}>
            <View style={{ width: 24 }} />
            <Text style={commonStyles.modalNavBarTitle}>Detaljer og utbedringer</Text>
            <Pressable onPress={() => router.back()}>
              <IconSymbol name="xmark" color={colors.error} size={24} />
            </Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[styles.text, { fontFamily: bodyFont }]}>Økt ikke funnet</Text>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Tilbake</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  const hasMissingItems = session.soldiers.some(soldier =>
    session.data.some(item =>
      item.statuses.some(s => s.soldierId === soldier.id && s.status === 'missing')
    )
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.fullScreenModal, { paddingTop: insets.top }]}>
        <View style={commonStyles.modalNavBar}>
          <View style={{ width: 24 }} />
          <Text style={commonStyles.modalNavBarTitle}>Detaljer og utbedringer</Text>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name="xmark" color={colors.error} size={24} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>KTS {session.date} {session.time}</Text>
            <Text style={[styles.subtitle, { fontFamily: bodyFont }]}>{session.squadName}</Text>
            {session.duration && (
              <View style={styles.durationContainer}>
                <IconSymbol name="stopwatch.fill" color={colors.textSecondary} size={20} />
                <Text style={[styles.duration, { fontFamily: bodyFont }]}>{session.duration}</Text>
              </View>
            )}
          </View>

          {session.soldiers.map(soldier => {
            const soldierMissing = session.data.filter(item =>
              item.statuses.some(s => s.soldierId === soldier.id && s.status === 'missing')
            );

            if (soldierMissing.length === 0) return null;

            return (
              <View key={soldier.id} style={styles.soldierCard}>
                <Text style={styles.soldierName}>
                  {soldier.name}
                  {soldier.role && ` (${soldier.role})`}
                </Text>
                {soldierMissing.map(item => {
                  const category = checklist.find(c => c.id === item.categoryId);
                  const checklistItem = category?.items.find(i => i.id === item.itemId);
                  const status = item.statuses.find(s => s.soldierId === soldier.id);

                  if (!category || !checklistItem) return null;

                  return (
                    <View key={item.itemId} style={styles.missingItem}>
                      <View style={styles.missingItemHeader}>
                        <View style={styles.missingItemIconContainer}>
                          <IconSymbol name="xmark" color={colors.error} size={20} />
                        </View>
                        <View style={styles.missingItemText}>
                          <Text style={[styles.missingItemName, { fontFamily: bodyFont }]}>{checklistItem.name}</Text>
                          {status?.description && (
                            <Text style={[styles.missingItemDesc, { fontFamily: bodyFont }]}>{status.description}</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.itemActions}>
                        <Pressable
                          style={styles.actionButton}
                          onPress={() =>
                            handleMarkAsOk(soldier.id, item.categoryId, item.itemId)
                          }
                        >
                          <IconSymbol name="checkmark.circle.fill" color={colors.primary} size={36} />
                        </Pressable>
                        <Pressable
                          style={styles.actionButton}
                          onPress={() =>
                            handleEditDescription(
                              soldier.id,
                              item.categoryId,
                              item.itemId,
                              status?.description
                            )
                          }
                        >
                          <IconSymbol name="pencil" color={colors.accent} size={20} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}

          {!hasMissingItems && (
            <View style={styles.noIssuesCard}>
              <Image
                source={require('@/assets/images/f54512be-2d40-4d54-93d7-66c0b49c0292.png')}
                style={styles.noIssuesIcon}
                resizeMode="contain"
              />
              <Text style={styles.noIssuesText}>Bravo zulu. Ingen feil eller mangler.</Text>
            </View>
          )}
        </ScrollView>

        <Modal
          visible={editingItem !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingItem(null)}
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rediger beskrivelse</Text>
                <Pressable onPress={() => setEditingItem(null)}>
                  <IconSymbol name="xmark" color={colors.error} size={24} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.modalInput, { fontFamily: bodyFont }]}
                value={descriptionText}
                onChangeText={setDescriptionText}
                placeholder="Beskriv problemet..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setEditingItem(null)}
                >
                  <Text style={styles.modalButtonText}>Avbryt</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSaveDescription}
                >
                  <Text style={styles.modalButtonTextSave}>Lagre</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fullScreenModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  text: {
    fontSize: 18,
    color: colors.text,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: colors.textSecondary,
    marginTop: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  duration: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  soldierCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
  },
  soldierName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  missingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  missingItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  missingItemIconContainer: {
    paddingTop: 2,
  },
  missingItemText: {
    flex: 1,
  },
  missingItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  missingItemDesc: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
  },
  noIssuesCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
  },
  noIssuesIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  noIssuesText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  modalButtonTextSave: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
