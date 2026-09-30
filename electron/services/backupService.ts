import { sqlite, dbPath } from '../db';
import fs from 'fs';
import path from 'path';
import { AuditLog } from '../types';

export const backupService = {
  createBackup(customDestinationDir?: string): { success: boolean; filePath?: string; fileSize?: number; error?: string } {
    try {
      const backupDir = customDestinationDir || path.join(path.dirname(dbPath), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const backupFileName = `agristore-backup-${timestamp}.db`;
      const targetFilePath = path.join(backupDir, backupFileName);

      // Execute SQLite backup via checkpoint and safe copy or VACUUM INTO
      sqlite.pragma('wal_checkpoint(TRUNCATE)');
      sqlite.prepare(`VACUUM INTO ?`).run(targetFilePath);

      const stats = fs.statSync(targetFilePath);

      sqlite.prepare(`
        INSERT INTO audit_logs (username, action, entity_type, entity_id, details)
        VALUES ('System', 'CREATE_BACKUP', 'system', 'backup', ?)
      `).run(`Created local database backup: ${backupFileName} (${(stats.size / 1024).toFixed(1)} KB)`);

      return {
        success: true,
        filePath: targetFilePath,
        fileSize: stats.size,
      };
    } catch (err: any) {
      console.error('Backup creation failed:', err);
      return { success: false, error: err.message };
    }
  },

  restoreBackup(backupSourcePath: string): { success: boolean; error?: string } {
    try {
      if (!fs.existsSync(backupSourcePath)) {
        return { success: false, error: 'Backup file does not exist' };
      }

      // Quick header check to verify it is an SQLite 3 database
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(backupSourcePath, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      if (!buffer.toString('utf-8').startsWith('SQLite format 3')) {
        return { success: false, error: 'Invalid backup file format. Must be an SQLite database.' };
      }

      // Close current sqlite connection, copy file, then reopen
      sqlite.close();
      fs.copyFileSync(backupSourcePath, dbPath);

      // Reopen connection is handled on app restart or caller
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  getAuditLogs(limit = 100): AuditLog[] {
    return sqlite.prepare(`
      SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?
    `).all(limit) as AuditLog[];
  },
};
