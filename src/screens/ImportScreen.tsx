import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '../components/PressableScale';
import { Account, createAccount, importStatement, listAccounts, renameAccount } from '../db/transactions';
import { useQuery } from '../db/useQuery';
import { usePdfExtractor } from '../pdf/PdfExtractorProvider';
import { PageContent } from '../pdf/types';
import { PdfPasswordRequiredError } from '../pdf/types';
import { parseStatement } from '../statement/registry';
import { ParsedStatement, ReconciliationResult } from '../statement/types';
import { contentWrap, radii, spacing, type } from '../theme/tokens';
import { Theme, useStyles, useTheme } from '../theme/ThemeContext';

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

function formatPeriod(account: Account): string {
  if (!account.lastImportedPeriodEnd) return 'Never imported';
  const date = new Date(account.lastImportedPeriodEnd);
  return `Last statement through ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// Running totals for one pick of one or more PDFs. `last` is the most
// recent statement, shown in full when only one file was imported.
type Summary = {
  files: number;
  extracted: number;
  added: number;
  duplicates: number;
  unbalanced: number;
  failed: string[];
  last: { statement: ParsedStatement; reconciliation: ReconciliationResult } | null;
};
const EMPTY_SUMMARY: Summary = { files: 0, extracted: 0, added: 0, duplicates: 0, unbalanced: 0, failed: [], last: null };

// `rest` = the base64 of the files still to process after the current one.
type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'needsPassword'; base64: string; forAccountId: string | null; rest: string[]; done: Summary }
  // No account chosen yet — the dropzone's generic entry point. `bank` is
  // whatever the registry detected from the statement text, if anything;
  // there is no masked account number to detect (see statement/types.ts).
  // One choice covers every file in the pick.
  | { kind: 'chooseAccount'; pages: PageContent[]; bank?: string; rest: string[]; done: Summary }
  | { kind: 'result'; summary: Summary }
  | { kind: 'error'; message: string };

export function ImportScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation();
  const { extractPdfText } = usePdfExtractor();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newAccountOpen, setNewAccountOpen] = useState(false);

  const accounts = useQuery(() => listAccounts(), [status.kind]);

  function importOne(pages: PageContent[], accountId: string, done: Summary): Summary {
    const { statement, reconciliation, added, duplicates } = importStatement(pages, accountId);
    return {
      ...done,
      files: done.files + 1,
      extracted: done.extracted + statement.transactions.length,
      added: done.added + added,
      duplicates: done.duplicates + duplicates,
      unbalanced: done.unbalanced + (reconciliation.ok ? 0 : 1),
      last: { statement, reconciliation },
    };
  }

  // Processes `files` in order. Stops to ask for a password or (when no
  // account is known yet) which account they belong to, then resumes with
  // the rest. A file that can't be read is skipped and reported at the end.
  async function runBatch(files: string[], accountId: string | null, done: Summary, opts?: { password?: string }) {
    setStatus({ kind: 'loading' });
    let summary = done;
    for (let i = 0; i < files.length; i++) {
      const rest = files.slice(i + 1);
      try {
        const result = await extractPdfText(files[i], i === 0 ? opts : undefined);
        if (accountId) {
          summary = importOne(result.pages, accountId, summary);
        } else {
          const detected = parseStatement(result.pages);
          setStatus({ kind: 'chooseAccount', pages: result.pages, bank: detected.bank, rest, done: summary });
          return;
        }
      } catch (err) {
        if (err instanceof PdfPasswordRequiredError) {
          setStatus({ kind: 'needsPassword', base64: files[i], forAccountId: accountId, rest, done: summary });
          return;
        }
        summary = { ...summary, failed: [...summary.failed, err instanceof Error ? err.message : String(err)] };
      }
    }
    if (summary.files === 0 && summary.failed.length > 0) setStatus({ kind: 'error', message: summary.failed[0] });
    else setStatus({ kind: 'result', summary });
  }

  async function pickPdf(forAccountId: string | null) {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true });
    if (picked.canceled) return;

    try {
      const files: string[] = [];
      for (const asset of picked.assets) files.push(await uriToBase64(asset.uri));
      await runBatch(files, forAccountId, EMPTY_SUMMARY);
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  // The chosen account applies to this file and every one after it.
  async function finishWithAccount(accountId: string) {
    if (status.kind !== 'chooseAccount') return;
    const done = importOne(status.pages, accountId, status.done);
    await runBatch(status.rest, accountId, done);
  }

  function chooseExistingAccount(accountId: string) {
    void finishWithAccount(accountId);
  }

  function createAndChoose(bank: string, maskedNumber: string, ownerLabel: string) {
    const accountId = createAccount({ bank: bank || 'Bank statement', maskedNumber: maskedNumber || null, ownerLabel });
    void finishWithAccount(accountId);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Import statement</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={13} accessibilityLabel="Close">
          <Feather name="x" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, contentWrap]}>
        {status.kind === 'chooseAccount' ? (
          <AccountChooser
            bank={status.bank}
            count={status.rest.length + 1 + status.done.files}
            accounts={accounts}
            onPick={chooseExistingAccount}
            onCreate={createAndChoose}
          />
        ) : status.kind === 'result' ? (
          <ResultCard
            summary={status.summary}
            onDone={() => navigation.goBack()}
          />
        ) : (
          <>
            <Pressable
              style={styles.dropzone}
              onPress={() => pickPdf(null)}
              disabled={status.kind === 'loading'}
            >
              {status.kind === 'loading' ? (
                <ActivityIndicator size="large" color={colors.accent} />
              ) : (
                <>
                  <View style={styles.dropzoneIconWrap}>
                    <Feather name="upload" size={22} color={colors.accent} />
                  </View>
                  <Text style={styles.dropzoneTitle}>Choose PDF statements</Text>
                  <Text style={styles.dropzoneCaption}>Supports Kotak Mahindra Bank and generic layouts</Text>
                </>
              )}
            </Pressable>

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
                  onPress={() => runBatch([status.base64, ...status.rest], status.forAccountId, status.done, { password })}
                >
                  <Text style={styles.passwordButtonText}>Unlock</Text>
                </PressableScale>
              </View>
            )}

            {status.kind === 'error' && <Text style={styles.errorText}>{status.message}</Text>}

            {accounts.length > 0 && (
              <View style={styles.accountsSection}>
                <Text style={styles.accountsHeading}>Accounts</Text>
                {accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    editing={editingAccountId === account.id}
                    onEdit={() => setEditingAccountId(account.id)}
                    onCancelEdit={() => setEditingAccountId(null)}
                    onSaveEdit={(bank, ownerLabel) => {
                      renameAccount(account.id, { bank, ownerLabel });
                      setEditingAccountId(null);
                    }}
                    onImport={() => pickPdf(account.id)}
                    disabled={status.kind === 'loading'}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountChooser({
  bank,
  count,
  accounts,
  onPick,
  onCreate,
}: {
  bank?: string;
  count: number;
  accounts: Account[];
  onPick: (accountId: string) => void;
  onCreate: (bank: string, maskedNumber: string, ownerLabel: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [showNewForm, setShowNewForm] = useState(accounts.length === 0);
  const [newBank, setNewBank] = useState(bank ?? '');
  const [newNickname, setNewNickname] = useState('');
  const [newOwner, setNewOwner] = useState('Me');

  return (
    <View>
      <Text style={styles.chooserTitle}>
        {count > 1 ? `Which account are these ${count} statements from?` : 'Which account is this?'}
      </Text>
      {bank && <Text style={styles.chooserHint}>Detected: {bank}</Text>}

      {accounts.map((account) => (
        <PressableScale key={account.id} style={styles.chooserRow} onPress={() => onPick(account.id)}>
          <View style={styles.chooserRowIcon}>
            <Feather name="credit-card" size={16} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountBank}>{account.bank}</Text>
            <Text style={styles.accountMeta}>
              {account.maskedNumber ? `${account.maskedNumber} · ` : ''}
              {account.ownerLabel}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </PressableScale>
      ))}

      {!showNewForm ? (
        <PressableScale style={styles.addAccountButton} onPress={() => setShowNewForm(true)}>
          <Feather name="plus" size={16} color={colors.accent} />
          <Text style={styles.addAccountButtonText}>Add new account</Text>
        </PressableScale>
      ) : (
        <View style={styles.newAccountForm}>
          <Text style={styles.fieldLabel}>BANK</Text>
          <TextInput style={styles.input} value={newBank} onChangeText={setNewBank} placeholder="e.g., HDFC Bank" />
          <Text style={styles.fieldLabel}>NICKNAME (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            value={newNickname}
            onChangeText={setNewNickname}
            placeholder="e.g., •••• 4821"
          />
          <Text style={styles.fieldLabel}>WHOSE ACCOUNT</Text>
          <TextInput style={styles.input} value={newOwner} onChangeText={setNewOwner} placeholder="Me" />
          <PressableScale
            style={[styles.saveButton, !newBank.trim() && styles.saveButtonDisabled]}
            onPress={() => onCreate(newBank.trim(), newNickname.trim(), newOwner.trim() || 'Me')}
            disabled={!newBank.trim()}
          >
            <Text style={styles.saveButtonText}>Continue</Text>
          </PressableScale>
        </View>
      )}
    </View>
  );
}

function AccountCard({
  account,
  editing,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onImport,
  disabled,
}: {
  account: Account;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (bank: string, ownerLabel: string) => void;
  onImport: () => void;
  disabled: boolean;
}) {
  const styles = useStyles(makeStyles);
  const [bank, setBank] = useState(account.bank);
  const [ownerLabel, setOwnerLabel] = useState(account.ownerLabel);

  if (editing) {
    return (
      <View style={styles.accountCard}>
        <Text style={styles.fieldLabel}>BANK</Text>
        <TextInput style={styles.input} value={bank} onChangeText={setBank} />
        <Text style={styles.fieldLabel}>WHOSE ACCOUNT</Text>
        <TextInput style={styles.input} value={ownerLabel} onChangeText={setOwnerLabel} />
        <View style={styles.editRow}>
          <PressableScale style={styles.editCancelButton} onPress={onCancelEdit}>
            <Text style={styles.editCancelButtonText}>Cancel</Text>
          </PressableScale>
          <PressableScale style={styles.editSaveButton} onPress={() => onSaveEdit(bank, ownerLabel)}>
            <Text style={styles.editSaveButtonText}>Save</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={styles.accountCard} onPress={onEdit}>
      <View style={styles.accountCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.accountBank}>{account.bank}</Text>
          <Text style={styles.accountMeta}>
            {account.maskedNumber ? `${account.maskedNumber} · ` : ''}
            {account.ownerLabel}
          </Text>
          <Text style={styles.accountPeriod}>{formatPeriod(account)}</Text>
        </View>
        <PressableScale style={styles.importButton} onPress={onImport} disabled={disabled}>
          <Text style={styles.importButtonText}>Import</Text>
        </PressableScale>
      </View>
    </Pressable>
  );
}

function ResultCard({ summary, onDone }: { summary: Summary; onDone: () => void }) {
  const { pillPalette } = useTheme();
  const styles = useStyles(makeStyles);
  const { statement, reconciliation } = summary.last!;
  const single = summary.files === 1;
  const balanced = single ? reconciliation.ok : summary.unbalanced === 0;
  const badge = balanced ? pillPalette[1] : pillPalette[3];
  return (
    <View style={styles.resultBox}>
      <Text style={styles.dropzoneTitle}>
        {single ? 'Extracted ' : `Imported ${summary.files} statements · `}
        <Text style={styles.numeral}>{summary.extracted}</Text> transaction{summary.extracted === 1 ? '' : 's'}
      </Text>
      {summary.duplicates > 0 && (
        <Text style={styles.balanceLabel}>
          {summary.added === 0
            ? 'Already imported. Nothing new added.'
            : `${summary.added} new · ${summary.duplicates} duplicate${summary.duplicates === 1 ? '' : 's'} skipped`}
        </Text>
      )}

      {single && (
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
      )}

      <View style={[styles.reconciliationBanner, { backgroundColor: badge.bg }]}>
        <Feather name={balanced ? 'check-circle' : 'alert-triangle'} size={16} color={badge.text} />
        <Text style={[styles.reconciliationText, { color: badge.text }]}>
          {single
            ? reconciliation.ok
              ? 'Balanced — opening + credits − debits matches the closing balance.'
              : `Off by ₹${Math.abs(reconciliation.delta).toFixed(2)}.`
            : balanced
              ? 'All statements balanced.'
              : `${summary.unbalanced} of ${summary.files} statements didn't balance.`}
        </Text>
      </View>

      {summary.failed.length > 0 && (
        <Text style={styles.errorText}>
          {summary.failed.length} file{summary.failed.length === 1 ? '' : 's'} couldn't be read: {summary.failed[0]}
        </Text>
      )}

      <PressableScale style={styles.doneButton} onPress={onDone}>
        <Text style={styles.doneButtonText}>Done</Text>
      </PressableScale>
    </View>
  );
}

const makeStyles = ({ colors, pillPalette }: Theme) => StyleSheet.create({
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
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.sheet,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  dropzoneIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.card,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  dropzoneTitle: {
    ...type.h2,
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  dropzoneCaption: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  numeral: {
    ...type.amountMd,
    color: colors.textPrimary,
  },
  passwordBox: {
    marginBottom: spacing.xxl,
    gap: spacing.sm,
  },
  passwordInput: {
    ...type.body,
    borderBottomWidth: 1,
    borderColor: colors.textPrimary,
    paddingVertical: 12,
  },
  passwordButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.button,
    padding: 14,
    alignItems: 'center',
  },
  passwordButtonText: {
    ...type.label,
    color: colors.accentText,
  },
  errorText: {
    marginBottom: spacing.xxl,
    color: colors.expenseText,
    textAlign: 'center',
  },
  accountsSection: {
    gap: spacing.sm,
  },
  accountsHeading: {
    ...type.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  accountCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  accountCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accountBank: {
    ...type.h3,
    color: colors.textPrimary,
  },
  accountMeta: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountPeriod: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  importButton: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  importButtonText: {
    ...type.label,
    color: colors.accent,
  },
  editRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  editCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editCancelButtonText: {
    ...type.label,
    color: colors.textSecondary,
  },
  editSaveButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
  },
  editSaveButtonText: {
    ...type.label,
    color: colors.accentText,
  },
  chooserTitle: {
    ...type.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  chooserHint: {
    ...type.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  chooserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  chooserRowIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.button,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: radii.card,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  addAccountButtonText: {
    ...type.label,
    color: colors.accent,
  },
  newAccountForm: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  input: {
    ...type.body,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...type.label,
    color: colors.accentText,
  },
  resultBox: {
    gap: spacing.xxl,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceLabel: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },
  balanceNumeral: {
    ...type.amountMd,
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  reconciliationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.button,
    padding: spacing.lg,
  },
  reconciliationText: {
    ...type.body,
    fontSize: 13,
    flex: 1,
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
