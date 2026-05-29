import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // =================================================================
  // 1. CLEANUP
  // =================================================================
  console.log('🧹 Cleaning up old entries...');
  await prisma.topicProgress.deleteMany({});
  await prisma.chapterProgress.deleteMany({});
  await prisma.teacherClass.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.topic.deleteMany({});
  await prisma.chapter.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.user.deleteMany({
    where: { role: { in: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'] } },
  });
  console.log('✅ Cleanup done.');

  // =================================================================
  // 2. SUPER ADMIN
  // =================================================================
  const superAdminHash = await bcrypt.hash('SuperAdmin@123', 12);
  await prisma.user.create({
    data: {
      email: 'superadmin@schooltracker.com',
      passwordHash: superAdminHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✅ Super Admin created.');

  // =================================================================
  // 3. SUBSCRIPTION PLAN
  // =================================================================
  const professionalPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'professional' },
    update: {},
    create: {
      name: 'Professional',
      slug: 'professional',
      description: 'For growing institutions',
      priceMonthly: 99.99,
      priceYearly: 999.99,
      teacherLimit: 50,
      features: ['Dashboard', 'Analytics', 'Bulk Import', 'Priority Support'],
      isActive: true,
      sortOrder: 2,
    },
  });

  // =================================================================
  // 4. DEMO SCHOOL
  // =================================================================
  const demoSchool = await prisma.school.upsert({
    where: { slug: 'demo-academy' },
    update: {},
    create: {
      name: 'Demo Academy',
      slug: 'demo-academy',
      email: 'admin@demoacademy.edu',
      phone: '+1-555-0100',
      address: '123 Education Lane',
      status: 'ACTIVE',
    },
  });

  await prisma.subscription.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      schoolId: demoSchool.id,
      planId: professionalPlan.id,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // =================================================================
  // 5. SCHOOL ADMIN
  // =================================================================
  const adminHash = await bcrypt.hash('aryannn.ks@gmail.com', 12);
  await prisma.user.create({
    data: {
      email: 'aryannn.ks@gmail.com',
      passwordHash: adminHash,
      name: 'Aryan KS',
      role: 'SCHOOL_ADMIN',
      schoolId: demoSchool.id,
    },
  });
  console.log('✅ School Admin created.');

  // =================================================================
  // 6. 10 TEACHERS — no subject assigned (assign manually later)
  // =================================================================
  console.log('⏳ Creating 10 teachers...');

  const teacherData = [
    { email: 'aryankumarswain99@gmail.com', password: 'aryankumarswain99@gmail.com', name: 'Aryan Kumar Swain' },
    { email: 'teacher2@demoacademy.edu',    password: 'Teacher2@123',                name: 'Priya Sharma'      },
    { email: 'teacher3@demoacademy.edu',    password: 'Teacher3@123',                name: 'Rahul Verma'       },
    { email: 'teacher4@demoacademy.edu',    password: 'Teacher4@123',                name: 'Sneha Patel'       },
    { email: 'teacher5@demoacademy.edu',    password: 'Teacher5@123',                name: 'Vikram Singh'      },
    { email: 'teacher6@demoacademy.edu',    password: 'Teacher6@123',                name: 'Meera Nair'        },
    { email: 'teacher7@demoacademy.edu',    password: 'Teacher7@123',                name: 'Amit Joshi'        },
    { email: 'teacher8@demoacademy.edu',    password: 'Teacher8@123',                name: 'Kavitha Reddy'     },
    { email: 'teacher9@demoacademy.edu',    password: 'Teacher9@123',                name: 'Suresh Yadav'      },
    { email: 'teacher10@demoacademy.edu',   password: 'Teacher10@123',               name: 'Anita Desai'       },
  ];

  const createdTeacherIds: string[] = [];

  for (const t of teacherData) {
    const hash = await bcrypt.hash(t.password, 12);

    const userRecord = await prisma.user.create({
      data: {
        email: t.email,
        passwordHash: hash,
        name: t.name,
        role: 'TEACHER',
        schoolId: demoSchool.id,
        status: 'ACTIVE',
      },
    });

    const teacherRecord = await prisma.teacher.create({
      data: {
        status: 'ACTIVE',
        user:   { connect: { id: userRecord.id } },
        school: { connect: { id: demoSchool.id } },
        // ✅ No subject assigned — assign manually via admin UI
      },
    });

    createdTeacherIds.push(teacherRecord.id);
  }
  console.log('✅ 10 Teachers created (no subject assigned).');

  // =================================================================
  // 7. CLASSES 1–12
  // =================================================================
  console.log('⏳ Creating Classes 1 to 12...');

  const createdClasses: { id: string; grade: string }[] = [];

  for (let g = 1; g <= 12; g++) {
    const dbClass = await prisma.class.create({
      data: {
        schoolId: demoSchool.id,
        name: `Class ${g}`,
        grade: `${g}`,
        section: 'A',
        sortOrder: g,
      },
    });
    createdClasses.push({ id: dbClass.id, grade: `${g}` });
  }
  console.log('✅ Classes 1–12 created.');

  // =================================================================
  // 8. 15 SUBJECTS → 5 CHAPTERS → 2 TOPICS each
  // =================================================================
  console.log('⏳ Creating subjects, chapters & topics...');

  const subjectDefinitions = [
    { name: 'Mathematics',        code: 'MATH', color: '#3b82f6' },
    { name: 'Physics',            code: 'PHY',  color: '#06b6d4' },
    { name: 'Chemistry',          code: 'CHEM', color: '#f59e0b' },
    { name: 'Biology',            code: 'BIO',  color: '#10b981' },
    { name: 'English',            code: 'ENG',  color: '#a855f7' },
    { name: 'Hindi',              code: 'HIN',  color: '#ec4899' },
    { name: 'History',            code: 'HIST', color: '#b45309' },
    { name: 'Geography',          code: 'GEO',  color: '#0ea5e9' },
    { name: 'Civics',             code: 'CIV',  color: '#84cc16' },
    { name: 'Economics',          code: 'ECO',  color: '#f97316' },
    { name: 'Computer Science',   code: 'CS',   color: '#6366f1' },
    { name: 'Physical Education', code: 'PE',   color: '#ef4444' },
    { name: 'Art & Craft',        code: 'ART',  color: '#d946ef' },
    { name: 'Music',              code: 'MUS',  color: '#14b8a6' },
    { name: 'Sanskrit',           code: 'SAN',  color: '#78716c' },
  ];

  const chapterNames = [
    'Foundational Fundamentals',
    'Core Concepts & Theories',
    'Applied Practical Analysis',
    'Mid-Term Evaluation Review',
    'Comprehensive Capstone Project',
  ];

  for (const cls of createdClasses) {
    for (let sIdx = 0; sIdx < subjectDefinitions.length; sIdx++) {
      const sub = subjectDefinitions[sIdx]!;

      const dbSubject = await prisma.subject.create({
        data: {
          schoolId: demoSchool.id,
          classId: cls.id,
          name: sub.name,
          code: `${sub.code}-${cls.grade}`,
          color: sub.color,
          sortOrder: sIdx + 1,
        },
      });

      for (let chIdx = 0; chIdx < chapterNames.length; chIdx++) {
        const dbChapter = await prisma.chapter.create({
          data: {
            schoolId: demoSchool.id,
            subjectId: dbSubject.id,
            classId: cls.id,
            title: `Chapter ${chIdx + 1}: ${chapterNames[chIdx]}`,
            sortOrder: chIdx + 1,
          },
        });

        await prisma.topic.createMany({
          data: [
            { schoolId: demoSchool.id, chapterId: dbChapter.id, title: 'Concept Introduction Lecture',  sortOrder: 1 },
            { schoolId: demoSchool.id, chapterId: dbChapter.id, title: 'Assignment Worksheet Practice', sortOrder: 2 },
          ],
        });
      }
    }
  }
  console.log('✅ 180 subjects, 900 chapters, 1800 topics created.');

  // =================================================================
  // 9. ASSIGN TEACHERS TO CLASSES (round-robin)
  // =================================================================
  console.log('⏳ Assigning teachers to classes...');

  for (let i = 0; i < createdClasses.length; i++) {
    const cls = createdClasses[i]!;
    const teacherId = createdTeacherIds[i % createdTeacherIds.length]!;

    await prisma.teacherClass.create({
      data: {
        schoolId: demoSchool.id,
        teacherId,
        classId: cls.id,
      },
    });
  }
  console.log('✅ Teachers assigned to classes.');

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('🛡️  SUPER_ADMIN  : superadmin@schooltracker.com   | SuperAdmin@123');
  console.log('🏫  SCHOOL_ADMIN : aryannn.ks@gmail.com           | aryannn.ks@gmail.com');
  console.log('👨‍🏫  TEACHER 1    : aryankumarswain99@gmail.com    | aryankumarswain99@gmail.com');
  console.log('👨‍🏫  TEACHERS 2–10: teacher{N}@demoacademy.edu     | Teacher{N}@123');
  console.log('');
  console.log('📚  Classes  : 1 to 12 (Section A)');
  console.log('📖  Subjects : 15 per class  → 180 total');
  console.log('📝  Chapters : 5 per subject → 900 total');
  console.log('✏️   Topics   : 2 per chapter → 1800 total');
  console.log('⚠️   Subjects NOT assigned to teachers — assign manually via admin UI');
  console.log('─────────────────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });