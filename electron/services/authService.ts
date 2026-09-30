import { sqlite, hashPassword, verifyPassword } from '../db';
import { User, UserRole } from '../types';

export const authService = {
  login(username: string, password: string): { success: boolean; user?: User; error?: string } {
    const row = sqlite.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!row) {
      return { success: false, error: 'User not found' };
    }

    const isValid = verifyPassword(password, row.password_hash);
    if (!isValid) {
      return { success: false, error: 'Incorrect password' };
    }

    return {
      success: true,
      user: {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role as UserRole,
        created_at: row.created_at,
      },
    };
  },

  getUsers(): User[] {
    const rows = sqlite.prepare('SELECT id, username, name, role, created_at FROM users ORDER BY id ASC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      name: r.name,
      role: r.role as UserRole,
      created_at: r.created_at,
    }));
  },

  createUser(username: string, name: string, role: UserRole, password: string): { success: boolean; error?: string } {
    try {
      const existing = sqlite.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        return { success: false, error: 'Username already exists' };
      }
      const hash = hashPassword(password);
      sqlite.prepare('INSERT INTO users (username, name, role, password_hash) VALUES (?, ?, ?, ?)').run(username, name, role, hash);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  changePassword(userId: number, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    try {
      const row = sqlite.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
      if (!row) return { success: false, error: 'User not found' };
      if (!verifyPassword(oldPassword, row.password_hash)) {
        return { success: false, error: 'Current password is incorrect' };
      }
      const newHash = hashPassword(newPassword);
      sqlite.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
