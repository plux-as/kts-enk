
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { IconSymbol } from '@/components/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AppSettingsScreen() {
  const [showAboutModal, setShowAboutModal] = useState(false);
  const insets = useSafeAreaInsets();

  const handleEditChecklist = () => {
    router.push('/edit-checklist');
  };

  const handleResetApp = () => {
    Alert.alert(
      'Tilbakestill App',
      'Er du sikker på at du vil slette alle data og starte på nytt? Dette vil fjerne alle økter, innstillinger og sjekklister.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Tilbakestill',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.clearAll();
              router.replace('/setup');
            } catch (error) {
              console.error('Error resetting app:', error);
              Alert.alert('Feil', 'Kunne ikke tilbakestille appen');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={commonStyles.navBar}>
          <Text style={commonStyles.navBarTitle}>Innstillinger</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable style={styles.optionCard} onPress={handleEditChecklist}>
            <View style={styles.optionIcon}>
              <IconSymbol name="pencil.and.list.clipboard" color={colors.primary} size={32} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Rediger sjekkliste</Text>
              <Text style={[styles.optionDescription, { fontFamily: bodyFont }]}>
                Legg til, rediger eller slett kategorier og sjekkliste-elementer
              </Text>
            </View>
            <IconSymbol name="chevron.right" color={colors.textSecondary} size={24} />
          </Pressable>

          <Pressable style={styles.optionCard} onPress={() => setShowAboutModal(true)}>
            <View style={styles.optionIcon}>
              <IconSymbol name="info.circle.fill" color={colors.primary} size={32} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Om appen</Text>
              <Text style={[styles.optionDescription, { fontFamily: bodyFont }]}>
                Informasjon om appen
              </Text>
            </View>
            <IconSymbol name="chevron.right" color={colors.textSecondary} size={24} />
          </Pressable>

          <View style={styles.spacer} />

          <Pressable style={styles.resetCard} onPress={handleResetApp}>
            <View style={styles.resetIcon}>
              <IconSymbol name="trash.fill" color={colors.error} size={32} />
            </View>
            <View style={styles.resetContent}>
              <Text style={styles.resetTitle}>Tilbakestill app</Text>
              <Text style={[styles.resetDescription, { fontFamily: bodyFont }]}>
                Slett alle data og start på nytt
              </Text>
            </View>
          </Pressable>
        </ScrollView>

        <Modal
          visible={showAboutModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAboutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Om appen</Text>
                <Pressable onPress={() => setShowAboutModal(false)}>
                  <IconSymbol name="xmark" color={colors.error} size={24} />
                </Pressable>
              </View>
              <ScrollView style={styles.modalScroll}>
                <Text style={[styles.aboutText, { fontFamily: bodyFont }]}>
                  Appen utveksler ikke data med en server eller eksterne tjenester, og kan gjerne brukes i flymodus eller uten dekning. Alle data knyttet til appen lagres kun lokalt på din enhet. Appen er utviklet av 3charlie.no. Tilbakemeldinger og forslag kan sendes til 3charlie@3charlie.no.
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
    marginBottom: 12,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  optionDescription: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  spacer: {
    height: 32,
  },
  resetCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error,
  },
  resetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  resetContent: {
    flex: 1,
  },
  resetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 4,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  resetDescription: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  modalScroll: {
    maxHeight: 400,
  },
  aboutText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
