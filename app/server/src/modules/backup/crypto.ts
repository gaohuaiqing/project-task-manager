// app/server/src/modules/backup/crypto.ts
import * as crypto from 'crypto';

/**
 * 备份模块的密码加密工具
 * 使用 AES-256-GCM 对称加密保护远程备份密码
 */

// 从环境变量获取加密密钥，或使用默认密钥
// 生产环境务必设置 BACKUP_ENCRYPTION_KEY 环境变量
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'task-manager-backup-encryption-key-2026';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * 从密钥种子派生固定长度的加密密钥
 */
function deriveKey(seed: string): Buffer {
  return crypto.createHash('sha256').update(seed).digest();
}

/**
 * 加密明文字符串
 * 返回格式: iv:authTag:ciphertext (hex encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';

  const key = deriveKey(ENCRYPTION_KEY);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * 解密加密字符串
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const key = deriveKey(ENCRYPTION_KEY);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // 解密失败时返回空字符串，避免抛出异常导致服务中断
    console.error('[BackupCrypto] Decryption failed:', error);
    return '';
  }
}
