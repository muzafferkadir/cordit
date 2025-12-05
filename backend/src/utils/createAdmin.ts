import 'dotenv/config';
import bcrypt from 'bcrypt';
import yargs from 'yargs';
import mongoose from 'mongoose';
import User from '../models/user';
import { login } from '../validators/user';

const mongoDB = process.env.DATABASE_URL || '';
mongoose.connect(mongoDB);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

interface Args {
  username?: string;
  password?: string;
  u?: string;
  p?: string;
}

const { argv } = yargs(process.argv.slice(2)).option('username', {
  alias: 'u',
  describe: 'The admin username',
  type: 'string',
}).option('password', {
  alias: 'p',
  describe: 'The admin password',
  type: 'string',
}) as { argv: Args };

const runningFromScript = require.main === module;

const createAdmin = async (): Promise<void> => {
  try {
    let username = argv.username || argv.u;
    let password = argv.password || argv.p;
    const createAdminRequest = process.env.CREATE_ADMIN_INITIALLY === 'true';

    if (createAdminRequest && !runningFromScript) {
      username = process.env.ADMIN_USERNAME;
      password = process.env.ADMIN_PASSWORD;
    }

    const { error } = login.validate({ username, password });
    if (error) {
      console.error('Error creating admin:', error);
      return;
    }

    const user = await User.findOne({ username });
    if (user) {
      if (!runningFromScript) return;
      console.log('Admin already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash(password!, 10);
    const newUser = new User({ username, password: hashedPassword, role: 'admin' });
    await newUser.save();
    console.log('Admin created successfully');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    if (runningFromScript) mongoose.disconnect();
  }
};

if (runningFromScript) {
  createAdmin();
}

export default createAdmin;
