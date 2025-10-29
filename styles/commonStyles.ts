
import { StyleSheet, ViewStyle, TextStyle, useColorScheme } from 'react-native';

// Light mode colors
const lightColors = {
  background: '#f0f0f0',
  text: '#1e1e1e',
  textSecondary: '#666666',
  primary: '#4CAF50',
  secondary: '#F44336',
  accent: '#2196F3',
  card: '#FFFFFF',
  highlight: '#FFEB3B',
};

// Dark mode colors
const darkColors = {
  background: '#1e1e1e',
  text: '#f0f0f0',
  textSecondary: '#999999',
  primary: '#4CAF50',
  secondary: '#F44336',
  accent: '#2196F3',
  card: '#2e2e2e',
  highlight: '#FFEB3B',
};

// Export light colors as default for now
export const colors = lightColors;

export const buttonStyles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    alignSelf: 'center',
    width: '100%',
  },
  accentButton: {
    backgroundColor: colors.accent,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  text: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: 'BigShouldersStencil_400Regular',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    width: '100%',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: colors.text,
  },
});
