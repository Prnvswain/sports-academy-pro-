import { PrismaClient } from '../src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting coach attendance migration to batch-wise...');

  try {
    // Check if batch_id column already exists
    const columns = await prisma.$queryRaw`
      SHOW COLUMNS FROM coach_attendance LIKE 'batch_id'
    `;
    
    const batchIdExists = columns.length > 0;
    
    if (!batchIdExists) {
      // Step 1: Add batch_id column as nullable
      console.log('Step 1: Adding batch_id column...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE coach_attendance 
        ADD COLUMN batch_id INT NULL
      `);
      console.log('✓ batch_id column added');
    } else {
      console.log('✓ batch_id column already exists, skipping');
    }

    // Check if foreign key constraint already exists
    const constraints = await prisma.$queryRaw`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'coach_attendance' 
      AND CONSTRAINT_NAME = 'coach_att_batch_id_fk'
    `;
    
    if (constraints.length === 0) {
      // Step 2: Add foreign key constraint
      console.log('Step 2: Adding foreign key constraint...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE coach_attendance 
        ADD CONSTRAINT coach_att_batch_id_fk 
        FOREIGN KEY (batch_id) REFERENCES batches(batch_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('✓ Foreign key constraint added');
    } else {
      console.log('✓ Foreign key constraint already exists, skipping');
    }

    // Step 3: Handle existing records
    console.log('Step 3: Handling existing records...');
    const existingRecords = await prisma.$queryRaw`
      SELECT attendance_id, coach_id, academy_id, date 
      FROM coach_attendance 
      WHERE batch_id IS NULL
    `;
    
    console.log(`Found ${existingRecords.length} existing records to update`);

    if (existingRecords.length > 0) {
      // For each existing record, try to find an active batch for the coach
      for (const record of existingRecords) {
        const batch = await prisma.$queryRaw`
          SELECT bc.batch_id 
          FROM batch_coaches bc
          INNER JOIN batches b ON bc.batch_id = b.batch_id
          WHERE bc.coach_id = ${record.coach_id}
          AND b.academy_id = ${record.academy_id}
          AND b.status = 'ACTIVE'
          LIMIT 1
        `;

        if (batch && batch.length > 0) {
          await prisma.$executeRawUnsafe(`
            UPDATE coach_attendance 
            SET batch_id = ${batch[0].batch_id}
            WHERE attendance_id = ${record.attendance_id}
          `);
          console.log(`✓ Updated record ${record.attendance_id} with batch_id ${batch[0].batch_id}`);
        } else {
          console.log(`⚠ No active batch found for coach ${record.coach_id}, deleting record ${record.attendance_id}`);
          await prisma.$executeRawUnsafe(`
            DELETE FROM coach_attendance 
            WHERE attendance_id = ${record.attendance_id}
          `);
        }
      }
    } else {
      console.log('✓ No records need batch_id assignment');
    }

    // Check if batch_id is already NOT NULL
    const columnInfo = await prisma.$queryRaw`
      SHOW COLUMNS FROM coach_attendance LIKE 'batch_id'
    `;
    const isNullable = columnInfo[0].Null === 'YES';
    
    if (isNullable) {
      // Step 4: Make batch_id NOT NULL
      console.log('Step 4: Making batch_id NOT NULL...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE coach_attendance 
        MODIFY COLUMN batch_id INT NOT NULL
      `);
      console.log('✓ batch_id is now NOT NULL');
    } else {
      console.log('✓ batch_id is already NOT NULL, skipping');
    }

    console.log('\n✅ Data migration completed successfully!');
    console.log('\n⚠️  Manual steps required:');
    console.log('1. Drop the old unique constraint: coach_attendance_coach_id_date_key');
    console.log('2. Add the new unique constraint: (coach_id, batch_id, date)');
    console.log('3. Run: npx prisma db push to sync schema');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
