import { seedDatabase } from './seed.js';

seedDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeder execution failed:', err);
    process.exit(1);
  });
