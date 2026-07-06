import { PrismaClient } from '../src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function migrateUniqueConstraint() {
  console.log('Migrating unique constraint for coach attendance...');

  try {
    // Check if old unique constraint exists
    const oldConstraint = await prisma.$queryRaw`
      SELECT INDEX_NAME 
      FROM information_schema.STATISTICS 
      WHERE TABLE_NAME = 'coach_attendance' 
      AND INDEX_NAME = 'coach_attendance_coach_id_date_key'
      AND NON_UNIQUE = 0
    `;
    
    if (oldConstraint.length > 0) {
      console.log('Step 1: Dropping old unique constraint (coach_id, date)...');
      
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE coach_attendance 
          DROP INDEX coach_attendance_coach_id_date_key
        `);
        console.log('✓ Old unique constraint dropped');
      } catch (error) {
        console.log('⚠ Could not drop old unique constraint:', error.message);
        console.log('Continuing with migration...');
      }
    } else {
      console.log('✓ Old unique constraint already removed, skipping');
    }

    // Check if new unique constraint already exists
    const newConstraint = await prisma.$queryRaw`
      SELECT INDEX_NAME 
      FROM information_schema.STATISTICS 
      WHERE TABLE_NAME = 'coach_attendance' 
      AND INDEX_NAME = 'coach_attendance_coach_id_batch_id_date_key'
      AND NON_UNIQUE = 0
    `;
    
    if (newConstraint.length === 0) {
      console.log('Step 2: Adding new unique constraint (coach_id, batch_id, date)...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE coach_attendance 
        ADD UNIQUE INDEX coach_attendance_coach_id_batch_id_date_key (coach_id, batch_id, date)
      `);
      console.log('✓ New unique constraint added');
    } else {
      console.log('✓ New unique constraint already exists, skipping');
    }

    console.log('\n✅ Unique constraint migration completed successfully!');
    console.log('\nNext step: Run npx prisma db push to sync schema');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateUniqueConstraint();
