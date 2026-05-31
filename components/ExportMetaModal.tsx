
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, bodyFont } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { KTS_MAX_TITLE_LENGTH, KTS_MAX_AUTHOR_LENGTH } from '@/types/share';

interface ExportMetaModalProps {
  visible: boolean;
  initialTitle: string;
  initialAuthor: string;
  onSubmit: (opts: { title: string; author: string }) => void;
  onClose: () => void;
}

export function ExportMetaModal({
  visible,
  initialTitle,
  initialAuthor,
  onSubmit,
  onClose,
}: ExportMetaModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState(initialAuthor);
  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setAuthor(initialAuthor);
    }
  }, [visible, initialTitle, initialAuthor]);

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return; // Button is disabled when empty
    }
    console.log('[ExportMetaModal] User submitted export meta — title:', trimmedTitle, 'author:', author.trim());
    onSubmit({ title: trimmedTitle, author: author.trim() });
  };

  const titleValid = title.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Del sjekkliste</Text>
            <Pressable onPress={onClose}>
              <IconSymbol name="xmark" color={colors.error} size={24} />
            </Pressable>
          </View>

          <Text style={styles.label}>Tittel</Text>
          <TextInput
            style={[styles.input, { fontFamily: bodyFont }]}
            value={title}
            onChangeText={t => setTitle(t.slice(0, KTS_MAX_TITLE_LENGTH))}
            placeholder="Navn på sjekklisten"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            returnKeyType="next"
          />

          <Text style={styles.label}>Forfatter (valgfritt)</Text>
          <TextInput
            style={[styles.input, { fontFamily: bodyFont }]}
            value={author}
            onChangeText={a => setAuthor(a.slice(0, KTS_MAX_AUTHOR_LENGTH))}
            placeholder="Ditt navn eller enhet"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.buttonCancel]}
              onPress={() => {
                console.log('[ExportMetaModal] User tapped Avbryt');
                onClose();
              }}
            >
              <Text style={styles.buttonCancelText}>Avbryt</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonSubmit, !titleValid && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!titleValid}
            >
              <Text style={styles.buttonSubmitText}>Del</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonSubmit: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonCancelText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'BigShouldersStencil_700Bold',
  },
  buttonSubmitText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'BigShouldersStencil_700Bold',
  },
});
