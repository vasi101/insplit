import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../modules/auth/auth.model';

async function seedAdmin() {
  const emailArg = process.argv[2]?.trim().toLowerCase();
  const passwordArg = process.argv[3]?.trim();

  console.log('Connecting to MongoDB...');
  await connectDatabase();

  if (emailArg) {
    let user = await User.findOne({ email: emailArg });
    if (user) {
      user.isAdmin = true;
      user.emailVerified = true;
      if (passwordArg) {
        user.passwordHash = await bcrypt.hash(passwordArg, 12);
      }
      await user.save();
      console.log(`✅ Promoted existing user ${emailArg} to Admin!`);
    } else {
      const password = passwordArg || 'Admin@123456';
      const passwordHash = await bcrypt.hash(password, 12);
      user = await User.create({
        name: 'Super Admin',
        email: emailArg,
        passwordHash,
        isAdmin: true,
        emailVerified: true,
      });
      console.log(`✅ Created new Admin user ${emailArg} (Password: ${password})`);
    }
  } else {
    // If no argument provided, find first user and promote to admin or create admin@insplit.local
    let user = await User.findOne({ isAdmin: true });
    if (user) {
      console.log(`ℹ️ Existing admin found: ${user.email} (Name: ${user.name})`);
    } else {
      user = await User.findOne();
      if (user) {
        user.isAdmin = true;
        user.emailVerified = true;
        await user.save();
        console.log(`✅ Promoted first user ${user.email} to Admin!`);
      } else {
        const defaultEmail = 'admin@insplit.com';
        const defaultPassword = 'AdminPassword123!';
        const passwordHash = await bcrypt.hash(defaultPassword, 12);
        await User.create({
          name: 'Super Admin',
          email: defaultEmail,
          passwordHash,
          isAdmin: true,
          emailVerified: true,
        });
        console.log(`✅ Created default admin account: ${defaultEmail} / ${defaultPassword}`);
      }
    }
  }

  await disconnectDatabase();
  console.log('Done.');
}

seedAdmin().catch((err) => {
  console.error('Error seeding admin:', err);
  process.exit(1);
});
