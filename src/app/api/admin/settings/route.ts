// ============================================================
// CREARD - API: Site Settings (Administración)
// GET  /api/admin/settings  - Obtener configuración del sitio
// PUT  /api/admin/settings  - Actualizar configuración del sitio
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSiteSettings, updateSiteSettings } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// List of all allowed fields for PUT
const ALLOWED_FIELDS = [
  // Hero
  'hero_badge_text', 'hero_badge_icon', 'hero_headline', 'hero_headline_highlight',
  'hero_subtitle', 'hero_location_text', 'hero_promo_text', 'hero_promo_highlight',
  'hero_cta_text', 'hero_cta_link', 'hero_background_url',
  // Courts Section
  'courts_section_title', 'courts_section_subtitle',
  // Sports Section
  'sports_section_badge', 'sports_section_title', 'sports_section_subtitle',
  // Promo Banner
  'promo_section_badge', 'promo_section_title', 'promo_section_subtitle', 'promo_cta_text',
  'selling_points',
  // How It Works
  'how_section_badge', 'how_section_title', 'how_section_subtitle',
  'how_cta_text', 'how_cta_subtext', 'how_steps',
  // Payment Methods
  'payment_methods_items', 'payment_methods',
  // Contact
  'contact_phone', 'contact_whatsapp', 'contact_email', 'contact_address',
  'social_facebook', 'social_instagram', 'social_tiktok',
  'business_hours', 'advance_payment_percent',
  // Promo
  'promo_enabled', 'promo_title', 'promo_description', 'promo_discount_percent', 'promo_valid_until',
];

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request).catch(() => null);
    const settings = await getSiteSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('[API /admin/settings GET]', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      );
    }

    await updateSiteSettings(updateData);
    const updated = await getSiteSettings();

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('[API /admin/settings PUT]', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
