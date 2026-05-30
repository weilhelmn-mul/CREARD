// ============================================================
// CREARD - JSON File Storage (Firebase Fallback)
// Persists data in a JSON file when Firebase is not configured
// ============================================================

import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COURTS_FILE = path.join(DATA_DIR, 'courts.json');

// Default courts (same as courts/route.ts fallback)
const DEFAULT_COURTS: Record<string, any> = {
  'cancha-1': {
    id: 'cancha-1',
    name: 'Cancha Fútbol 1',
    sport: 'futbol',
    description: 'Cancha premium con césped sintético de última generación.',
    branch_id: 'branch-1',
    images: ['/cancha-futbol-1.png'],
    price_per_hour: 60,
    is_active: true,
    amenities: ['Cesped sintetico', 'Iluminacion LED', 'Vestuarios'],
  },
  'cancha-2': {
    id: 'cancha-2',
    name: 'Cancha Fútbol 2',
    sport: 'futbol',
    description: 'Cancha estándar con césped sintético.',
    branch_id: 'branch-1',
    images: ['/cancha-futbol-2.png'],
    price_per_hour: 50,
    is_active: true,
    amenities: ['Cesped sintetico', 'Iluminacion'],
  },
  'cancha-3': {
    id: 'cancha-3',
    name: 'Cancha Fútbol 3',
    sport: 'futbol',
    description: 'Cancha con techado parcial.',
    branch_id: 'branch-1',
    images: ['/cancha-futbol-3.png'],
    price_per_hour: 55,
    is_active: true,
    amenities: ['Cesped sintetico', 'Techado parcial', 'Vestuarios'],
  },
  'cancha-4': {
    id: 'cancha-4',
    name: 'Cancha Fútbol 4',
    sport: 'futbol',
    description: 'Nuestra cancha más nueva.',
    branch_id: 'branch-1',
    images: ['/cancha-futbol-4.png'],
    price_per_hour: 65,
    is_active: true,
    amenities: ['Cesped premium', 'Iluminacion LED', 'Duchas', 'Estacionamiento'],
  },
  'cancha-5': {
    id: 'cancha-5',
    name: 'Vóley Cancha A',
    sport: 'voley',
    description: 'Piso PVC profesional con red reglamentaria.',
    branch_id: 'branch-1',
    images: ['/cancha-voley.png'],
    price_per_hour: 40,
    is_active: true,
    amenities: ['Piso PVC', 'Red reglamentaria', 'Iluminacion LED'],
  },
  'cancha-6': {
    id: 'cancha-6',
    name: 'Vóley Cancha B',
    sport: 'voley',
    description: 'Segunda cancha de vóley techada con iluminación profesional.',
    branch_id: 'branch-1',
    images: ['/cancha-voley.png'],
    price_per_hour: 40,
    is_active: true,
    amenities: ['Piso PVC', 'Iluminacion LED', 'Techado'],
  },
};

// Ensure data directory and files exist
async function ensureDataFiles(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists or cannot create - use tmp fallback
  }
  
  // Try to initialize files if they don't exist
  for (const file of [BOOKINGS_FILE, USERS_FILE, COURTS_FILE]) {
    try {
      await fs.access(file);
    } catch {
      try {
        // For courts, initialize with default courts
        if (file === COURTS_FILE) {
          await fs.writeFile(file, JSON.stringify(DEFAULT_COURTS, null, 2));
        } else {
          await fs.writeFile(file, '{}');
        }
      } catch {
        // If we can't write to project dir, use /tmp
        const tmpDir = '/tmp/creard-data';
        await fs.mkdir(tmpDir, { recursive: true });
        const tmpFile = file.replace(DATA_DIR, tmpDir);
        try {
          await fs.access(tmpFile);
        } catch {
          if (file === COURTS_FILE) {
            await fs.writeFile(tmpFile, JSON.stringify(DEFAULT_COURTS, null, 2));
          } else {
            await fs.writeFile(tmpFile, '{}');
          }
        }
      }
    }
  }
}

async function readJsonFile(filePath: string): Promise<Record<string, any>> {
  try {
    await ensureDataFiles();
    let resolvedPath = filePath;
    try {
      await fs.access(filePath);
    } catch {
      resolvedPath = filePath.replace(DATA_DIR, '/tmp/creard-data');
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
      try {
        await fs.access(resolvedPath);
      } catch {
        await fs.writeFile(resolvedPath, '{}');
      }
    }
    const content = await fs.readFile(resolvedPath, 'utf-8');
    return JSON.parse(content || '{}');
  } catch {
    return {};
  }
}

async function writeJsonFile(filePath: string, data: Record<string, any>): Promise<void> {
  try {
    await ensureDataFiles();
    let resolvedPath = filePath;
    try {
      await fs.access(path.dirname(filePath));
    } catch {
      resolvedPath = filePath.replace(DATA_DIR, '/tmp/creard-data');
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    }
    await fs.writeFile(resolvedPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[JSON Storage] Write error:', err);
  }
}

// Generate a simple unique ID
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

// ============================================================
// Bookings CRUD
// ============================================================

export async function jsonGetBookings(filters?: {
  courtId?: string;
  userId?: string;
  userEmail?: string;
  date?: string;
  status?: string;
}): Promise<any[]> {
  const data = await readJsonFile(BOOKINGS_FILE);
  let bookings = Object.values(data) as any[];

  if (filters?.courtId) bookings = bookings.filter((b) => b.court_id === filters.courtId);
  if (filters?.userId) bookings = bookings.filter((b) => b.user_id === filters.userId);
  if (filters?.userEmail) bookings = bookings.filter((b) => b.user_email === filters.userEmail);
  if (filters?.date) bookings = bookings.filter((b) => b.date === filters.date);
  if (filters?.status) bookings = bookings.filter((b) => b.status === filters.status);

  // Sort by start_time
  bookings.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  return bookings;
}

export async function jsonGetBookingById(id: string): Promise<any | null> {
  const data = await readJsonFile(BOOKINGS_FILE);
  return data[id] || null;
}

export async function jsonCreateBooking(bookingData: any): Promise<string> {
  const id = generateId('bk');
  const now = new Date().toISOString();
  const booking = {
    ...bookingData,
    id,
    created_at: now,
    updated_at: now,
  };
  const data = await readJsonFile(BOOKINGS_FILE);
  data[id] = booking;
  await writeJsonFile(BOOKINGS_FILE, data);
  return id;
}

export async function jsonUpdateBooking(id: string, updates: any): Promise<void> {
  const data = await readJsonFile(BOOKINGS_FILE);
  if (data[id]) {
    data[id] = { ...data[id], ...updates, updated_at: new Date().toISOString() };
    await writeJsonFile(BOOKINGS_FILE, data);
  }
}

// ============================================================
// Users CRUD
// ============================================================

export async function jsonGetUserById(id: string): Promise<any | null> {
  const data = await readJsonFile(USERS_FILE);
  return data[id] || null;
}

export async function jsonGetUserByEmail(email: string): Promise<any | null> {
  const data = await readJsonFile(USERS_FILE);
  const users = Object.values(data) as any[];
  return users.find((u) => u.email === email) || null;
}

export async function jsonCreateUser(userData: any): Promise<void> {
  const data = await readJsonFile(USERS_FILE);
  const now = new Date().toISOString();
  data[userData.id] = { ...userData, created_at: now, updated_at: now };
  await writeJsonFile(USERS_FILE, data);
}

export async function jsonUpdateUser(id: string, updates: any): Promise<void> {
  const data = await readJsonFile(USERS_FILE);
  if (data[id]) {
    data[id] = { ...data[id], ...updates, updated_at: new Date().toISOString() };
    await writeJsonFile(USERS_FILE, data);
  }
}

export async function jsonGetAllUsers(): Promise<any[]> {
  const data = await readJsonFile(USERS_FILE);
  return Object.values(data);
}

// ============================================================
// Payments (embedded in booking documents)
// ============================================================

export async function jsonCreatePayment(bookingId: string, paymentData: any): Promise<string> {
  const paymentId = generateId('pay');
  const now = new Date().toISOString();
  const payment = {
    ...paymentData,
    id: paymentId,
    booking_id: bookingId,
    created_at: now,
    updated_at: now,
  };
  const data = await readJsonFile(BOOKINGS_FILE);
  if (data[bookingId]) {
    if (!data[bookingId].payments) data[bookingId].payments = [];
    data[bookingId].payments.push(payment);
    data[bookingId].updated_at = now;
    await writeJsonFile(BOOKINGS_FILE, data);
  }
  return paymentId;
}

export async function jsonGetPayments(bookingId: string): Promise<any[]> {
  const booking = await jsonGetBookingById(bookingId);
  return booking?.payments || [];
}

// ============================================================
// Courts (seeded with defaults, read-only in JSON mode)
// ============================================================

export async function jsonGetCourtById(id: string): Promise<any | null> {
  const data = await readJsonFile(COURTS_FILE);
  if (data[id]) {
    return data[id];
  }
  // Fallback to default courts
  return DEFAULT_COURTS[id] || null;
}

export async function jsonGetAllCourts(): Promise<any[]> {
  const data = await readJsonFile(COURTS_FILE);
  const courts = Object.values(data) as any[];
  // Merge with defaults (defaults as fallback)
  const allCourtIds = new Set([...Object.keys(data), ...Object.keys(DEFAULT_COURTS)]);
  return Array.from(allCourtIds).map((id) => data[id] || DEFAULT_COURTS[id]);
}
