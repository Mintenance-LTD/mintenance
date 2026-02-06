import { NextRequest, NextResponse } from 'next/server';
import { materialsService } from '@/lib/services/MaterialsService';
import { logger } from '@mintenance/shared';

/**
 * GET /api/materials/[id] - Get a single material by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      );
    }

    const material = await materialsService.getMaterialById(id);

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(material);
  } catch (error: unknown) {
    logger.error('GET /api/materials/[id] exception', error);
    return NextResponse.json(
      { error: 'Failed to fetch material', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/materials/[id] - Update a material (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check for admin role
    // const session = await getServerSession();
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Prevent updating immutable fields
    delete body.id;
    delete body.created_at;
    delete body.created_by;

    const updatedMaterial = await materialsService.updateMaterial(id, body);

    return NextResponse.json(updatedMaterial);
  } catch (error: unknown) {
    logger.error('PATCH /api/materials/[id] exception', error);
    return NextResponse.json(
      { error: 'Failed to update material', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[id] - Delete a material (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check for admin role
    // const session = await getServerSession();
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      );
    }

    await materialsService.deleteMaterial(id);

    return NextResponse.json(
      { success: true, message: 'Material deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    logger.error('DELETE /api/materials/[id] exception', error);
    return NextResponse.json(
      { error: 'Failed to delete material', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
