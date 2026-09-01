#!/usr/bin/env python3
"""
Fix P0-01, P0-02, P0-05, P0-12, P0-13, P0-14
"""

BASE = '/home/z/my-project'

def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def fix_auth_middleware(filepath):
    """P0-01: Disable header fallback in production."""
    content = read(filepath)
    
    # FIX 1: In requireAuth, block fallback in production after token error
    old1 = '''    } catch (tokenError: any) {
      console.warn('[AUTH] Token verification failed:', tokenError.code || tokenError.message);
      // Fall through to legacy header check
    }
  }

  // --- Fallback: Legacy header-based auth ---
  // Works in demo mode AND when Firebase Client SDK failed (no token available).
  // SECURITY: x-user-role is NEVER trusted for admin/super_admin — those roles
  // must come from a verified Firebase token or Firestore lookup.
  const userId = request.headers.get('x-user-id');'''
    
    new1 = '''    } catch (tokenError: any) {
      console.warn('[AUTH] Token verification failed:', tokenError.code || tokenError.message);
      // P0-01 FIX: In production, reject invalid tokens
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Token invalido o expirado.' }, { status: 401 });
      }
      // Fall through to legacy header check (development/demo only)
    }
  }

  // --- Fallback: Legacy header-based auth (DEVELOPMENT/DEMO ONLY) ---
  // P0-01 FIX: DISABLED in production to prevent identity spoofing
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Autenticacion requerida.' }, { status: 401 });
  }
  // SECURITY: x-user-role is NEVER trusted for admin/super_admin — those roles
  // must come from a verified Firebase token or Firestore lookup.
  const userId = request.headers.get('x-user-id');'''
    
    content = content.replace(old1, new1)
    
    # FIX 2: In requireAnyAuth, same treatment
    old2 = '''    } catch (tokenError: any) {
      console.warn('[AUTH] Token verification failed:', tokenError.code || tokenError.message);
      // Fall through to fallback check
    }
  }

  // --- Fallback: Legacy header-based auth ---
  // SECURITY: x-user-role is NEVER trusted — role is looked up from Firestore.
  const userId = request.headers.get('x-user-id');'''
    
    new2 = '''    } catch (tokenError: any) {
      console.warn('[AUTH] Token verification failed:', tokenError.code || tokenError.message);
      // P0-01 FIX: In production, reject invalid tokens
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Token invalido o expirado.' }, { status: 401 });
      }
      // Fall through to fallback check (development/demo only)
    }
  }

  // --- Fallback: Legacy header-based auth (DEVELOPMENT/DEMO ONLY) ---
  // P0-01 FIX: DISABLED in production to prevent identity spoofing
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Autenticacion requerida.' }, { status: 401 });
  }
  // SECURITY: x-user-role is NEVER trusted — role is looked up from Firestore.
  const userId = request.headers.get('x-user-id');'''
    
    content = content.replace(old2, new2)
    
    write(filepath, content)
    print('  [P0-01+P0-13] auth-middleware.ts: Header fallback disabled in production')


def fix_auth_route(filepath):
    """P0-02: Remove hardcoded credentials. P0-13: Disable demo mode in production."""
    content = read(filepath)
    
    # P0-02: Admin credentials from env
    content = content.replace(
        "const DEMO_ADMIN_EMAIL = 'weilhelmn@gmail.com';\n        const DEMO_ADMIN_PASSWORD = 'Creard2025!';",
        "const DEMO_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'weilhelmn@gmail.com';\n        const DEMO_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';"
    )
    
    # P0-13: Guard demo login
    content = content.replace(
        "if (email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {",
        "if (process.env.NODE_ENV === 'production') {\n          return NextResponse.json({ error: 'Modo demo no disponible en produccion.' }, { status: 403 });\n        }\n        if (DEMO_ADMIN_PASSWORD && email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {"
    )
    
    # P0-02: Auto-promote uses env var
    content = content.replace(
        "const ADMIN_EMAIL = 'weilhelmn@gmail.com';",
        "const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';"
    )
    content = content.replace(
        "if (email === ADMIN_EMAIL && userRole !== 'super_admin') {",
        "if (ADMIN_EMAIL && email === ADMIN_EMAIL && userRole !== 'super_admin') {"
    )
    
    # P0-13: Disable demo register
    content = content.replace(
        "// Demo mode: create a mock user (auto-approved) and save to JSON storage\n      if (!isFirebaseAvailable()) {",
        "// Demo mode disabled in production (P0-13)\n      if (!isFirebaseAvailable() && process.env.NODE_ENV !== 'production') {"
    )
    
    # P0-13: Disable demo login
    content = content.replace(
        "// Demo mode: accept any login\n      if (!isFirebaseAvailable()) {",
        "// P0-13 FIX: Demo mode disabled in production\n      if (!isFirebaseAvailable() && process.env.NODE_ENV !== 'production') {"
    )
    
    # P0-13: Disable demo get-user (second occurrence)
    parts = content.split("// Demo mode")
    if len(parts) >= 3:
        parts[2] = parts[2].replace(
            "if (!isFirebaseAvailable()) {",
            "// P0-13 FIX: Demo mode disabled in production\n      if (!isFirebaseAvailable() && process.env.NODE_ENV !== 'production') {",
            1
        )
        content = "// Demo mode".join(parts)
    
    write(filepath, content)
    print('  [P0-02+P0-13] auth/route.ts: Hardcoded credentials removed, demo disabled in production')


def fix_next_config(filepath):
    """P0-05: Add security headers."""
    content = '''import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },
  allowedDevOrigins: process.env.NODE_ENV === "production" ? [] : ["*"],
  // P0-05 FIX: Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.culqi.com https://js.culqi.com",
              "frame-src https://www.culqi.com https://cdn.culqi.com",
              "connect-src 'self' https://firestore.googleapis.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://fcmregistrations.googleapis.com https://graph.facebook.com https://api.culqi.com",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https: http:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL || "https://creard.vercel.app" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
'''
    write(filepath, content)
    print('  [P0-05] next.config.ts: Security headers added')


def fix_create_admin(filepath):
    """P0-14: Harden create-admin endpoint."""
    content = read(filepath)
    
    # No default secret
    content = content.replace(
        "const SETUP_SECRET = process.env.SETUP_SECRET || 'creard-setup-2025';",
        "const SETUP_SECRET = process.env.SETUP_SECRET;\n  // P0-14 FIX: No default secret - must be explicitly set\n  if (!SETUP_SECRET) {\n    return NextResponse.json({ error: 'SETUP_SECRET no configurado.' }, { status: 500 });\n  }"
    )
    
    # Block in production
    content = content.replace(
        "    // Verify setup secret",
        "    // P0-14 FIX: Block in production entirely\n    if (process.env.NODE_ENV === 'production') {\n      return NextResponse.json({ error: 'Endpoint deshabilitado en produccion.' }, { status: 403 });\n    }\n\n    // Verify setup secret"
    )
    
    # Remove password from response
    content = content.replace(
        "email: ADMIN_EMAIL,\n      password: ADMIN_PASSWORD,\n      warning: 'GUARDA ESTAS CREDENCIALES.",
        "email: ADMIN_EMAIL,\n      // P0-14 FIX: Password removed from response\n      warning: 'Endpoint ejecutado. Elimina antes de produccion.',"
    )
    
    # Env var credentials
    content = content.replace(
        "const ADMIN_EMAIL = 'weilhelmn@gmail.com';\n    const ADMIN_PASSWORD = 'Creard2025!';",
        "// P0-14 FIX: Credentials from environment\n    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@creard.com';\n    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;\n    if (!ADMIN_PASSWORD) {\n      return NextResponse.json({ error: 'ADMIN_PASSWORD no configurado.' }, { status: 500 });\n    }"
    )
    
    write(filepath, content)
    print('  [P0-14] create-admin/route.ts: Hardened')


def fix_auth_helpers(filepath):
    """P0-12: Remove x-user-role from headers."""
    content = read(filepath)
    content = content.replace(
        "'x-user-role': (store.user?.role || 'user') as string,",
        "// P0-12 FIX: x-user-role removed (was data leakage, server never trusted it)"
    )
    write(filepath, content)
    print('  [P0-12] auth-helpers.ts: x-user-role header removed')


print('=== Batch 1: P0-01, P0-02, P0-05, P0-12, P0-13, P0-14 ===')

fix_auth_middleware(f'{BASE}/src/lib/auth-middleware.ts')
fix_auth_route(f'{BASE}/src/app/api/auth/route.ts')
fix_next_config(f'{BASE}/next.config.ts')
fix_create_admin(f'{BASE}/src/app/api/setup/create-admin/route.ts')
fix_auth_helpers(f'{BASE}/src/lib/auth-helpers.ts')

print('\nBatch 1 complete!')
