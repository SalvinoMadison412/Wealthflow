// '%text%' for `LIKE ? ESCAPE '\'`: the user's % and _ (and the escape char) match literally.
export function containsPattern(text: string): string {
  return `%${text.trim().replace(/[\\%_]/g, '\\$&')}%`;
}
