import { PrismaClient } from '@prisma/client';
 
const p = new PrismaClient();
 
async function main() {
  const tc = await p.topicProgress.deleteMany({});
  const cp = await p.chapterProgress.deleteMany({});
  console.log(`✅ Cleared ${cp.count} chapterProgress records`);
  console.log(`✅ Cleared ${tc.count} topicProgress records`);
}
 
main()
  .catch(console.error)
  .finally(() => p.$disconnect());
 