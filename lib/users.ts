import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export const MAX_USES = 3;
export const WINDOW_HOURS = 24;

export interface UserUsage {
  count: number;
  windowStart: string;
}

export interface User {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  approvalToken: string;
  sessionToken: string;
  createdAt: string;
  approvedAt?: string;
  unlimited?: boolean;
  usage: {
    'analyze-stock': UserUsage;
    'geopolitical-exposure': UserUsage;
  };
}

function readUsers(): User[] {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function getUserByEmail(email: string): User | undefined {
  return readUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserByApprovalToken(token: string): User | undefined {
  return readUsers().find(u => u.approvalToken === token);
}

export function getUserBySessionToken(token: string): User | undefined {
  return readUsers().find(u => u.sessionToken === token);
}

export function createUser(email: string): User {
  const users = readUsers();
  const now = new Date().toISOString();
  const user: User = {
    id: randomUUID(),
    email: email.toLowerCase(),
    status: 'pending',
    approvalToken: randomUUID(),
    sessionToken: randomUUID(),
    createdAt: now,
    usage: {
      'analyze-stock': { count: 0, windowStart: now },
      'geopolitical-exposure': { count: 0, windowStart: now },
    },
  };
  users.push(user);
  writeUsers(users);
  return user;
}

export function approveUser(approvalToken: string): User | null {
  const users = readUsers();
  const idx = users.findIndex(u => u.approvalToken === approvalToken);
  if (idx === -1) return null;
  users[idx].status = 'approved';
  users[idx].approvedAt = new Date().toISOString();
  users[idx].sessionToken = randomUUID();
  writeUsers(users);
  return users[idx];
}

export type Feature = 'analyze-stock' | 'geopolitical-exposure';

function resolveUsage(usage: UserUsage): { count: number; windowStart: string } {
  const now = new Date();
  const windowStart = new Date(usage.windowStart);
  const hoursSince = (now.getTime() - windowStart.getTime()) / (1000 * 60 * 60);
  if (hoursSince >= WINDOW_HOURS) {
    return { count: 0, windowStart: now.toISOString() };
  }
  return { count: usage.count, windowStart: usage.windowStart };
}

// In-memory store for bypass sessions (not persisted)
const bypassSessions = new Map<string, User>();

export function createBypassSession(token: string): User {
  const now = new Date().toISOString();
  const user: User = {
    id: 'bypass',
    email: 'bypass@dev.local',
    status: 'approved',
    approvalToken: '',
    sessionToken: token,
    createdAt: now,
    unlimited: true,
    usage: {
      'analyze-stock': { count: 0, windowStart: now },
      'geopolitical-exposure': { count: 0, windowStart: now },
    },
  };
  bypassSessions.set(token, user);
  return user;
}

export function checkAndIncrementUsage(
  sessionToken: string,
  feature: Feature,
): { allowed: boolean; remaining: number; resetAt: string } | null {
  // Check bypass sessions first
  const bypass = bypassSessions.get(sessionToken);
  if (bypass) {
    return { allowed: true, remaining: 999, resetAt: new Date(Date.now() + 86400000).toISOString() };
  }

  const users = readUsers();
  const idx = users.findIndex(u => u.sessionToken === sessionToken);
  if (idx === -1) return null;

  const user = users[idx];
  if (user.status !== 'approved') return null;

  if (user.unlimited) {
    return { allowed: true, remaining: 999, resetAt: new Date(Date.now() + 86400000).toISOString() };
  }

  const resolved = resolveUsage(user.usage[feature]);
  user.usage[feature].windowStart = resolved.windowStart;
  user.usage[feature].count = resolved.count;

  const resetAt = new Date(
    new Date(resolved.windowStart).getTime() + WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  if (resolved.count >= MAX_USES) {
    writeUsers(users);
    return { allowed: false, remaining: 0, resetAt };
  }

  user.usage[feature].count += 1;
  writeUsers(users);
  return { allowed: true, remaining: MAX_USES - user.usage[feature].count, resetAt };
}

export function getUsageSummary(sessionToken: string): {
  user: User;
  analyzeStock: { remaining: number; resetAt: string };
  geopoliticalExposure: { remaining: number; resetAt: string };
} | null {
  // Bypass sessions
  const bypass = bypassSessions.get(sessionToken);
  if (bypass) {
    const resetAt = new Date(Date.now() + 86400000).toISOString();
    return { user: bypass, analyzeStock: { remaining: 999, resetAt }, geopoliticalExposure: { remaining: 999, resetAt } };
  }

  const user = getUserBySessionToken(sessionToken);
  if (!user || user.status !== 'approved') return null;

  if (user.unlimited) {
    const resetAt = new Date(Date.now() + 86400000).toISOString();
    return { user, analyzeStock: { remaining: 999, resetAt }, geopoliticalExposure: { remaining: 999, resetAt } };
  }

  const calcRemaining = (usage: UserUsage) => {
    const resolved = resolveUsage(usage);
    const resetAt = new Date(
      new Date(resolved.windowStart).getTime() + WINDOW_HOURS * 60 * 60 * 1000,
    ).toISOString();
    return { remaining: Math.max(0, MAX_USES - resolved.count), resetAt };
  };

  return {
    user,
    analyzeStock: calcRemaining(user.usage['analyze-stock']),
    geopoliticalExposure: calcRemaining(user.usage['geopolitical-exposure']),
  };
}
