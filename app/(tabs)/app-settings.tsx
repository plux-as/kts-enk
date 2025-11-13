
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { IconSymbol } from '@/components/IconSymbol';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AppSettingsScreen() {
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
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Innstillinger</Text>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.optionCard} onPress={handleEditChecklist}>
          <View style={styles.optionIcon}>
            <IconSymbol name="pencil.and.list.clipboard" color={colors.primary} size={32} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Rediger sjekkliste</Text>
            <Text style={styles.optionDescription}>
              Legg til, rediger eller slett kategorier og sjekkliste-elementer
            </Text>
          </View>
          <IconSymbol name="chevron.right" color={colors.textSecondary} size={24} />
        </Pressable>

        <View style={styles.spacer} />

        <Pressable style={styles.resetCard} onPress={handleResetApp}>
          <View style={styles.resetIcon}>
            <IconSymbol name="trash.fill" color={colors.secondary} size={32} />
          </View>
          <View style={styles.resetContent}>
            <Text style={styles.resetTitle}>Tilbakestill app</Text>
            <Text style={styles.resetDescription}>
              Slett alle data og start på nytt
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
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
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    marginBottom: 12,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '20',
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
    fontFamily: 'System',
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
    borderColor: colors.secondary,
  },
  resetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary + '20',
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
    color: colors.secondary,
    marginBottom: 4,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  resetDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
});
