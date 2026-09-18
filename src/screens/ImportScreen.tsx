import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

// PR 4 gives this screen its real design (dropzone + multiple bank
// accounts). For now the pick/extract/password/result logic is moved here
// unchanged from the old HomeScreen, just behind a modal header — see
// docs/REDESIGN_PLAN.md PR 3.
export function ImportScreen() {
  const navigation = useNavigation();
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
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Import statement</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="x" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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

            <PressableScale style={styles.doneButton} onPress={() => navigation.goBack()}>
              <Text style={styles.doneButtonText}>Done</Text>
            </PressableScale>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.pageGutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...type.h2,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.pageGutter,
  },
  dropzoneWrap: {
    marginBottom: spacing.xxl,
  },
  dropzone: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.sheet,
    backgroundColor: colors.surfaceContainerLow,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  numeral: {
    ...type.amountMd,
    color: colors.onSurface,
  },
  dropzoneIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.card,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  dropzoneTitle: {
    ...type.h2,
    fontSize: 20,
    color: colors.onSurface,
    textAlign: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: '60%',
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  orText: {
    ...type.caption,
    color: colors.outline,
  },
  dropzoneAction: {
    ...type.body,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  passwordBox: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  passwordInput: {
    ...type.body,
    borderBottomWidth: 1,
    borderColor: colors.onSurface,
    paddingVertical: 12,
  },
  passwordButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    padding: 14,
    alignItems: 'center',
  },
  passwordButtonText: {
    ...type.label,
    color: colors.white,
  },
  errorText: {
    marginTop: spacing.xxl,
    color: colors.error,
    textAlign: 'center',
  },
  resultBox: {
    marginTop: spacing.xxl,
    gap: spacing.xxl,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceLabel: {
    ...type.caption,
    color: colors.outline,
    textAlign: 'center',
    marginBottom: 2,
  },
  balanceNumeral: {
    ...type.amountMd,
    fontSize: 20,
    color: colors.onSurface,
    textAlign: 'center',
  },
  reconciliationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.black,
    borderRadius: radii.button,
    padding: spacing.lg,
  },
  reconciliationBannerFailed: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.error,
  },
  reconciliationText: {
    ...type.body,
    fontSize: 13,
    color: colors.white,
    flex: 1,
  },
  reconciliationTextFailed: {
    color: colors.error,
  },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    ...type.label,
    fontSize: 15,
    color: colors.accentText,
  },
});
