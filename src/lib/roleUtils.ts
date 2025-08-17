/**
 * ロール判定用のユーティリティ関数
 */

/**
 * ユーザーがパワーユーザーまたは管理者かどうかを判定
 * @param role ユーザーのロール（大文字小文字を区別しない）
 * @returns パワーユーザーまたは管理者の場合true
 */
export function checkIsPowerUser(role: string | null | undefined): boolean {
  if (!role) return false;
  
  const normalizedRole = role.toUpperCase();
  return normalizedRole === 'POWER_USER' || normalizedRole === 'ADMIN';
}