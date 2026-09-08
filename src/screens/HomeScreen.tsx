import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePdfExtractor } from '../pdf/PdfExtractorProvider';
import { ExtractResult, PdfPasswordRequiredError } from '../pdf/types';

// Colors lifted from design/mockups/home-dropzone.html. Custom
// Clash Display / Cabinet Grotesk webfonts are skipped for this
// proof-of-concept screen — add via expo-font when the Home screen
// gets its final pass (build-order step 6).
const colors = {
  background: '#fff8f6',
  onSurface: '#261814',
  onSurfaceVariant: '#5a413a',
  primary: '#872200',
  signalOrange: '#ff5722',
  outlineVariant: '#e2bfb5',
  surfaceContainerLow: '#fff1ed',
  error: '#ba1a1a',
};

// Reads a local file:// URI as base64 via RN's built-in fetch/Blob/FileReader
// rather than expo-file-system: Expo Go sandboxes file access per-project,
// and expo-document-picker's cache output falls outside that sandbox for
// both the legacy and new expo-file-system APIs (a dev-client-only quirk,
// not present in a standalone EAS build, but this route avoids it either way).
function uriToBase64(uri: string): Promise<string> {
  return fetch(uri)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        })
    );
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'needsPassword'; base64: string }
  | { kind: 'result'; result: ExtractResult }
  | { kind: 'error'; message: string };

export function HomeScreen() {
  const { extractPdfText } = usePdfExtractor();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [password, setPassword] = useState('');

  async function runExtraction(base64: string, opts?: { password?: string }) {
    setStatus({ kind: 'loading' });
    try {
      const result = await extractPdfText(base64, opts);
      setStatus({ kind: 'result', result });
    } catch (err) {
      if (err instanceof PdfPasswordRequiredError) {
        setStatus({ kind: 'needsPassword', base64 });
      } else {
        setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  async function pickPdf() {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (picked.canceled) return;

    const base64 = await uriToBase64(picked.assets[0].uri);
    await runExtraction(base64);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headline}>The Mirror</Text>
        <Text style={styles.subtitle}>
          Reflect on your financial reality. Drop your statement to begin the analysis.
        </Text>
      </View>

      <Pressable
        style={styles.dropzone}
        onPress={pickPdf}
        disabled={status.kind === 'loading'}
      >
        {status.kind === 'loading' ? (
          <ActivityIndicator color={colors.signalOrange} size="large" />
        ) : (
          <>
            <Text style={styles.dropzoneTitle}>Drop your statement</Text>
            <Text style={styles.dropzoneAction}>Tap to upload PDF</Text>
          </>
        )}
      </Pressable>
      <Text style={styles.lockNote}>🔒 Bank-level encryption. Your data never leaves this device.</Text>

      {status.kind === 'needsPassword' && (
        <View style={styles.passwordBox}>
          <Text style={styles.dropzoneTitle}>This PDF is password-protected</Text>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={styles.passwordButton}
            onPress={() => runExtraction(status.base64, { password })}
          >
            <Text style={styles.passwordButtonText}>Unlock</Text>
          </Pressable>
        </View>
      )}

      {status.kind === 'error' && <Text style={styles.errorText}>{status.message}</Text>}

      {status.kind === 'result' && (
        <View style={styles.resultBox}>
          <Text style={styles.dropzoneTitle}>
            Extracted {status.result.pages.length} page
            {status.result.pages.length === 1 ? '' : 's'}
          </Text>
          {status.result.pages.map((page) => (
            <Text key={page.pageNumber} style={styles.resultText}>
              Page {page.pageNumber}: {page.items.map((item) => item.str).join(' ')}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 32,
    paddingTop: 64,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dropzoneTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.onSurface,
    textAlign: 'center',
  },
  dropzoneAction: {
    fontSize: 16,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  lockNote: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 16,
  },
  passwordBox: {
    marginTop: 24,
    gap: 12,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  passwordButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  passwordButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 24,
    color: colors.error,
    textAlign: 'center',
  },
  resultBox: {
    marginTop: 24,
    gap: 8,
  },
  resultText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
});
