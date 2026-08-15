import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    include: {
      enrollments: {
        include: {
          duration_plan: true,
          sport: true,
        }
      },
      receipts: {
        where: { status: 'COMPLETED' }
      }
    }
  });

  console.log(`Total students: ${students.length}`);
  for (const s of students) {
    console.log(`\n--- Student ID: ${s.student_id} | Name: ${s.name} | Status: ${s.status} | Deleted: ${s.deleted_at ? 'Yes' : 'No'} ---`);
    console.log(`Advance Balance: ${s.advance_balance}`);
    console.log(`Enrollments count: ${s.enrollments.length}`);
    for (const e of s.enrollments) {
      console.log(`  Enrollment ID: ${e.enrollment_id} | Active: ${e.is_active} | Plan: ${e.duration_plan?.name} | Sport: ${e.sport?.name} | Start: ${e.plan_start_date?.toISOString().split('T')[0]} | End: ${e.plan_end_date?.toISOString().split('T')[0]}`);
    }
    console.log(`Receipts count: ${s.receipts.length}`);
    for (const r of s.receipts) {
      console.log(`  Receipt: ₹${r.amount} | Date: ${r.payment_date?.toISOString().split('T')[0]} | Remarks: ${r.remarks}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
