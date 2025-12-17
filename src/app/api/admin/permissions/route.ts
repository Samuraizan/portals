import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabase } from '@/lib/db/client';
import { hasPermission } from '@/lib/rbac/permissions';
import { grantPlayerAccess, revokePlayerAccess } from '@/lib/rbac/permissions-server';
import { z } from 'zod';

const grantPermissionSchema = z.object({
  phoneNumber: z.string().min(10),
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  accessLevel: z.enum(['view', 'manage', 'admin']),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const revokePermissionSchema = z.object({
  userId: z.string().uuid(),
  playerId: z.string().min(1),
});

// GET - List all user permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canManageUsers')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const userId = searchParams.get('userId');

    let query = supabase
      .from('user_player_permissions')
      .select(`
        *,
        users:user_id (
          id,
          zo_user_id,
          phone_number,
          first_name,
          last_name,
          email
        )
      `)
      .or('expires_at.is.null,expires_at.gt.now()');

    if (playerId) {
      query = query.eq('player_id', playerId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('granted_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Permissions API error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch permissions' } },
      { status: 500 }
    );
  }
}

// POST - Grant access to a player
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canManageUsers')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage user access' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = grantPermissionSchema.parse(body);

    // Find or create user by phone number
    let { data: user } = await supabase
      .from('users')
      .select('id, phone_number')
      .eq('phone_number', validated.phoneNumber)
      .single();

    if (!user) {
      // Create placeholder user - will be updated when they login
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          zo_user_id: `pending-${validated.phoneNumber}`,
          phone_number: validated.phoneNumber,
          roles: ['marketing'],
        })
        .select('id, phone_number')
        .single();

      if (createError) throw createError;
      user = newUser;
    }

    // Grant access
    const result = await grantPlayerAccess({
      userId: user.id,
      phoneNumber: validated.phoneNumber,
      playerId: validated.playerId,
      playerName: validated.playerName,
      accessLevel: validated.accessLevel,
      grantedBy: session.user.mobile_number,
      expiresAt: validated.expiresAt,
      notes: validated.notes,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({
      success: true,
      message: `Access granted to ${validated.phoneNumber} for ${validated.playerName}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.issues } },
        { status: 400 }
      );
    }

    console.error('Grant permission error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to grant access' } },
      { status: 500 }
    );
  }
}

// DELETE - Revoke access
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, 'canManageUsers')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to manage user access' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = revokePermissionSchema.parse(body);

    const result = await revokePlayerAccess({
      userId: validated.userId,
      playerId: validated.playerId,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Access revoked successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.issues } },
        { status: 400 }
      );
    }

    console.error('Revoke permission error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to revoke access' } },
      { status: 500 }
    );
  }
}

