import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../components/AppHeader';
import { PressableScale } from '../components/PressableScale';
import { useTransactions } from '../data/TransactionsContext';
import { usePdfExtractor } from '../pdf/PdfExtractorProvider';
import { PdfPasswordRequiredError } from '../pdf/types';
import { colors, radii, spacing, type } from '../theme/tokens';

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
  | { kind: 'result' }
  | { kind: 'error'; message: string };

export function HomeScreen() {
  const { extractPdfText } = usePdfExtractor();
  const { loadFromPages, statement, reconciliation } = useTransactions();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [password, setPassword] = useState('');

  async function runExtraction(base64: string, opts?: { password?: string }) {
    setStatus({ kind: 'loading' });
    try {
      const result = await extractPdfText(base64, opts);
      loadFromPages(result.pages);
      setStatus({ kind: 'result' });
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
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.headline}>The Mirror</Text>
          <Text style={styles.subtitle}>
            Reflect on your financial reality. Drop your statement to begin the analysis.
          </Text>
        </View>

        <View style={styles.dropzoneWrap}>
          <PressableScale
            style={styles.dropzone}
            onPress={pickPdf}
            disabled={status.kind === 'loading'}
          >
            {status.kind === 'loading' ? (
              <ActivityIndicator size="large" color={colors.accent} />
            ) : (
              <>
                <View style={styles.dropzoneIconWrap}>
                  <Feather name="upload" size={22} color={colors.primary} />
                </View>
                <Text style={styles.dropzoneTitle}>Drop your statement</Text>
                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>OR</Text>
                  <View style={styles.orLine} />
                </View>
                <Text style={styles.dropzoneAction}>Tap to upload PDF/CSV</Text>
              </>
            )}
          </PressableScale>
        </View>

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
            <PressableScale
              style={styles.passwordButton}
              onPress={() => runExtraction(status.base64, { password })}
            >
              <Text style={styles.passwordButtonText}>Unlock</Text>
            </PressableScale>
          </View>
        )}

        {status.kind === 'error' && <Text style={styles.errorText}>{status.message}</Text>}

        {status.kind === 'result' && statement && reconciliation && (
          <View style={styles.resultBox}>
            <Text style={styles.dropzoneTitle}>
              Extracted <Text style={styles.numeral}>{statement.transactions.length}</Text> transaction
              {statement.transactions.length === 1 ? '' : 's'}
            </Text>

            <View style={styles.balanceRow}>
              <View>
                <Text style={styles.balanceLabel}>OPENING</Text>
                <Text style={styles.balanceNumeral}>₹{statement.openingBalance.toFixed(2)}</Text>
              </View>
              <View>
                <Text style={styles.balanceLabel}>CLOSING</Text>
                <Text style={styles.balanceNumeral}>₹{statement.closingBalance.toFixed(2)}</Text>
              </View>
            </View>

            <View style={[styles.reconciliationBanner, !reconciliation.ok && styles.reconciliationBannerFailed]}>
              <Feather
                name={reconciliation.ok ? 'check-circle' : 'alert-triangle'}
                size={16}
                color={reconciliation.ok ? colors.white : colors.error}
              />
              <Text
                style={[
                  styles.reconciliationText,
                  !reconciliation.ok && styles.reconciliationTextFailed,
                ]}
              >
                {reconciliation.ok
                  ? 'Reconciled — opening + credits − debits matches the closing balance.'
                  : `Reconciliation off by ₹${Math.abs(reconciliation.delta).toFixed(2)}.`}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.marginPage,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: spacing.stackLg,
  },
  headline: {
    ...type.headlineLg,
    color: colors.onSurface,
    marginBottom: spacing.stackSm,
  },
  subtitle: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  dropzoneWrap: {
    marginBottom: spacing.stackLg,
  },
  dropzone: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerLow,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    padding: spacing.gutter,
  },
  numeral: {
    ...type.numeral,
    color: colors.onSurface,
  },
  dropzoneIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.stackSm,
  },
  dropzoneTitle: {
    ...type.headlineMd,
    fontSize: 20,
    color: colors.onSurface,
    textAlign: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    marginTop: spacing.stackSm,
    width: '60%',
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  orText: {
    ...type.labelSm,
    color: colors.outline,
  },
  dropzoneAction: {
    ...type.bodyMd,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  passwordBox: {
    marginTop: spacing.stackMd,
    gap: spacing.stackSm,
  },
  passwordInput: {
    ...type.bodyMd,
    borderBottomWidth: 1,
    borderColor: colors.onSurface,
    paddingVertical: 12,
  },
  passwordButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: 14,
    alignItems: 'center',
  },
  passwordButtonText: {
    ...type.labelMd,
    letterSpacing: 0,
    color: colors.white,
  },
  errorText: {
    marginTop: spacing.stackMd,
    color: colors.error,
    textAlign: 'center',
  },
  resultBox: {
    marginTop: spacing.stackMd,
    gap: spacing.stackMd,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceLabel: {
    ...type.labelSm,
    color: colors.outline,
    textAlign: 'center',
    marginBottom: 2,
  },
  balanceNumeral: {
    ...type.numeral,
    fontSize: 20,
    color: colors.onSurface,
    textAlign: 'center',
  },
  reconciliationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.black,
    borderRadius: radii.md,
    padding: spacing.gutter,
  },
  reconciliationBannerFailed: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.error,
  },
  reconciliationText: {
    ...type.bodyMd,
    fontSize: 13,
    color: colors.white,
    flex: 1,
  },
  reconciliationTextFailed: {
    color: colors.error,
  },
});
