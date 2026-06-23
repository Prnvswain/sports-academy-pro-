/**
 * Migration Script: Populate Age and Category for Existing Students
 * 
 * This script calculates and populates age and category fields for existing students.
 * If DOB is available, it calculates age and category from DOB.
 * If only age is available, it calculates category from age.
 */

import prisma from '../src/config/prisma.js';
import { calculateAgeAndCategory, determineCategory } from '../src/utils/age.util.js';

async function migrateStudentAgeAndCategory() {
  try {
    console.log('[Migration] Starting student age and category migration...');

    // Find all students
    const students = await prisma.student.findMany({
      where: { is_deleted: false },
      select: { student_id: true, name: true, dob: true, age: true },
    });

    console.log(`[Migration] Found ${students.length} students`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      let calculatedAge = student.age;
      let calculatedCategory = null;

      // If DOB is available, calculate age and category from DOB
      if (student.dob) {
        const { age, category } = calculateAgeAndCategory(student.dob);
        calculatedAge = age;
        calculatedCategory = category;
        console.log(
          `[Migration] Student "${student.name}" (ID: ${student.student_id}): DOB=${student.dob.toISOString().split('T')[0]}, Age=${age}, Category=${category}`,
        );
      } 
      // If only age is available, calculate category from age
      else if (student.age) {
        calculatedCategory = determineCategory(student.age);
        console.log(
          `[Migration] Student "${student.name}" (ID: ${student.student_id}): No DOB, using existing age=${student.age}, Category=${calculatedCategory}`,
        );
      } 
      // No DOB or age, skip
      else {
        console.log(
          `[Migration] Student "${student.name}" (ID: ${student.student_id}): No DOB or age, skipping`,
        );
        skippedCount++;
        continue;
      }

      // Update student with calculated values
      await prisma.student.update({
        where: { student_id: student.student_id },
        data: {
          age: calculatedAge,
          category: calculatedCategory,
        },
      });

      updatedCount++;
    }

    console.log(`[Migration] Updated ${updatedCount} students`);
    console.log(`[Migration] Skipped ${skippedCount} students (no DOB or age)`);
    console.log('[Migration] Migration completed successfully');
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateStudentAgeAndCategory();
