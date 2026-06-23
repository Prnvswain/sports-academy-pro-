/**
 * Migration Script: Sync Batch Status with Sport Status
 * 
 * This script finds all batches where the sport is ACTIVE but the batch is INACTIVE,
 * and updates those batches to ACTIVE to fix the sync issue.
 */

import prisma from '../src/config/prisma.js';

async function syncBatchSportStatus() {
  try {
    console.log('[Migration] Starting batch-sport status sync...');

    // Find all ACTIVE sports
    const activeSports = await prisma.sport.findMany({
      where: { status: 'ACTIVE' },
      select: { sport_id: true, name: true },
    });

    console.log(`[Migration] Found ${activeSports.length} active sports`);

    let totalBatchesUpdated = 0;

    // For each active sport, find and reactivate inactive batches
    for (const sport of activeSports) {
      const inactiveBatches = await prisma.batch.findMany({
        where: {
          sport_id: sport.sport_id,
          status: 'INACTIVE',
        },
        select: { batch_id: true, name: true },
      });

      if (inactiveBatches.length > 0) {
        console.log(
          `[Migration] Sport "${sport.name}" (ID: ${sport.sport_id}) has ${inactiveBatches.length} inactive batches:`,
          inactiveBatches.map((b) => `  - ${b.name} (ID: ${b.batch_id})`).join('\n'),
        );

        // Update all inactive batches for this sport to ACTIVE
        const updateResult = await prisma.batch.updateMany({
          where: {
            sport_id: sport.sport_id,
            status: 'INACTIVE',
          },
          data: { status: 'ACTIVE' },
        });

        console.log(
          `[Migration] Updated ${updateResult.count} batches for sport "${sport.name}" to ACTIVE`,
        );
        totalBatchesUpdated += updateResult.count;
      }
    }

    console.log(`[Migration] Total batches updated: ${totalBatchesUpdated}`);
    console.log('[Migration] Migration completed successfully');
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
syncBatchSportStatus();
