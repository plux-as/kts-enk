
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles, bodyFont } from '@/styles/commonStyles';
import { storage } from '@/utils/storage';
import { Soldier } from '@/types/checklist';
import { IconSymbol } from '@/components/IconSymbol';

export default function SetupScreen() {
  const [squadName, setSquadName] = useState('');
  const [numberOfSoldiers, setNumberOfSoldiers] = useState('');
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [step, setStep] = useState<'squad' | 'soldiers'>('squad');

  const handleSquadSubmit = () => {
    if (!squadName.trim()) {
      Alert.alert('Feil', 'Vennligst skriv inn lagets navn');
      return;
    }

    const num = parseInt(numberOfSoldiers);
    if (isNaN(num) || num < 1 || num > 50) {
      Alert.alert('Feil', 'Vennligst skriv inn et gyldig antall soldater (1-50)');
      return;
    }

    const newSoldiers: Soldier[] = Array.from({ length: num }, (_, i) => ({
      id: `soldier-${Date.now()}-${i}`,
      name: '',
      role: '',
    }));

    setSoldiers(newSoldiers);
    setStep('soldiers');
  };

  const updateSoldier = (index: number, field: 'name' | 'role', value: string) => {
    const updated = [...soldiers];
    updated[index][field] = value;
    setSoldiers(updated);
  };

  const handleComplete = async () => {
    const incompleteSoldiers = soldiers.filter(s => !s.name.trim());
    if (incompleteSoldiers.length > 0) {
      Alert.alert('Feil', 'Vennligst fyll inn navn for alle soldater');
      return;
    }

    try {
      await storage.saveSquadSettings({
        squadName: squadName.trim(),
        soldiers,
      });
      await storage.setSetupComplete(true);
      router.replace('/(tabs)/(home)');
    } catch (error) {
      console.error('Error saving setup:', error);
      Alert.alert('Feil', 'Kunne ikke lagre innstillingene');
    }
  };

  if (step === 'squad') {
    return (
      <View style={commonStyles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Oppsett av Lag</Text>
          <Text style={[styles.subtitle, { fontFamily: bodyFont }]}>Definer lagets detaljer</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Lagsnavn</Text>
            <TextInput
              style={[styles.input, { fontFamily: bodyFont }]}
              value={squadName}
              onChangeText={setSquadName}
              placeholder="F.eks. 2 Alfa"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Antall Soldater</Text>
            <TextInput
              style={[styles.input, { fontFamily: bodyFont }]}
              value={numberOfSoldiers}
              onChangeText={setNumberOfSoldiers}
              placeholder="F.eks. 8"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={handleSquadSubmit}>
            <Text style={styles.primaryButtonText}>Neste</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Soldater</Text>
        <Text style={[styles.subtitle, { fontFamily: bodyFont }]}>Definer navn og rolle for hver soldat</Text>

        {soldiers.map((soldier, index) => (
          <View key={soldier.id} style={styles.soldierCard}>
            <Text style={styles.soldierNumber}>Soldat {index + 1}</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Navn</Text>
              <TextInput
                style={[styles.input, { fontFamily: bodyFont }]}
                value={soldier.name}
                onChangeText={(value) => updateSoldier(index, 'name', value)}
                placeholder="F.eks. Ole Hansen"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Rolle (valgfritt)</Text>
              <TextInput
                style={[styles.input, { fontFamily: bodyFont }]}
                value={soldier.role}
                onChangeText={(value) => updateSoldier(index, 'role', value)}
                placeholder="F.eks. Geværsoldat"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.stickyButtonContainer}>
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setStep('squad')}
          >
            <Text style={styles.secondaryButtonText}>Tilbake</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleComplete}
          >
            <Text style={styles.primaryButtonText}>Fullfør</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 140,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  soldierCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 3,
  },
  soldierNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '40',
    padding: 20,
    paddingBottom: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(188, 241, 53, 0.3)',
    elevation: 5,
    minHeight: 56,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
