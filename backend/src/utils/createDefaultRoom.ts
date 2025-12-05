import Room from '../models/room';
import { logger } from './logger';

const createDefaultRoom = async (): Promise<void> => {
  try {
    // Check if default room exists
    const existingDefaultRoom = await Room.findOne({ isDefault: true });
    
    if (existingDefaultRoom) {
      logger.info('Default room already exists');
      return;
    }

    // Create default room
    const defaultRoom = new Room({
      name: 'default',
      description: 'Default chat room for all users',
      isDefault: true,
      activeUsers: [],
      maxUsers: 100,
    });

    await defaultRoom.save();
    logger.info('Default room created successfully');
  } catch (error) {
    logger.error('Error creating default room:', error);
  }
};

export default createDefaultRoom;
