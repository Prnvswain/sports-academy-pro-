import prisma from './src/config/prisma.js';

async function main() {
  const student = await prisma.student.findUnique({
    where: { student_id: 1 },
    include: {
      enrollments: {
        include: {
          sport: true,
          duration_plan: true
        }
      },
      fees: true,
      receipts: true
    }
  });

  console.log(`Student: ${student.name} (ID: ${student.student_id}, Status: ${student.status}, AutoDeactivated: ${student.auto_deactivated})`);
  console.log('Enrollments:');
  for (const e of student.enrollments) {
    console.log(`  - Enrollment ID: ${e.enrollment_id}`);
    console.log(`    Sport: ${e.sport?.name || 'none'} (Base Fee: ${e.sport?.base_fee || 0})`);
    console.log(`    Plan: ${e.duration_plan?.name || 'none'} (Multiplier: ${e.duration_plan?.multiplier || 1})`);
    console.log(`    Is Active: ${e.is_active}`);
    console.log(`    Sports Fee: ${e.sports_fee}`);
    console.log(`    Final Fee: ${e.final_fee}`);
    console.log(`    Paid Amount: ${e.paid_amount}`);
    console.log(`    Created At: ${e.created_at.toISOString()}`);
  }
  console.log('Fees:');
  for (const f of student.fees) {
    console.log(`  - Fee ID: ${f.fee_id}, Amount Due: ${f.amount_due}, Status: ${f.status}, Created At: ${f.created_at.toISOString()}`);
  }
  console.log('Receipts:');
  for (const r of student.receipts) {
    console.log(`  - Receipt ID: ${r.receipt_id}, Amount: ${r.amount}, Status: ${r.status}, Created At: ${r.created_at.toISOString()}`);
  }

  await prisma.$disconnect();
}

main();
