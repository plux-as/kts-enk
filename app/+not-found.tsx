import { Stack, router } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Ikke funnet' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Denne siden finnes ikke</Text>
        <Text style={styles.subtitle}>
          Noe gikk galt under navigeringen. Du kan trygt gå tilbake til startsiden.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => {
            console.log('[NotFound] User tapped Gå til startsiden');
            router.replace('/(tabs)');
          }}
        >
          <Text style={styles.buttonText}>Gå til startsiden</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
