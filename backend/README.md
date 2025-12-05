# Litecord Backend API

Real-time chat application backend with voice chat support (LiveKit ready).

## Features

✅ TypeScript with strict mode
✅ User authentication (JWT)
✅ Room management
✅ Real-time text chat
✅ Message history
✅ Active user tracking
✅ Role-based access control (Admin/User)
🔄 LiveKit voice chat integration (ready for implementation)

## API Endpoints

### Authentication
- `POST /user/login` - Login user

### Rooms
- `GET /room` - Get all rooms
- `GET /room/:id` - Get room details
- `POST /room` - Create room (admin only)
- `PUT /room/:id` - Update room (admin only)
- `DELETE /room/:id` - Delete room (admin only)
- `POST /room/:id/join` - Join a room
- `POST /room/:id/leave` - Leave a room
- `GET /room/:id/users` - Get active users

### Messages
- `POST /message` - Send message to room
- `GET /message?roomId=xxx&page=1&limit=50` - Get messages
- `DELETE /message/:id` - Delete message

## Installation

\`\`\`bash
yarn install
yarn dev
\`\`\`

## Environment Variables

\`\`\`env
DATABASE_URL=mongodb://localhost:27017/litecord
ACCESS_TOKEN_SECRET=your-secret-key
CREATE_ADMIN_INITIALLY=true
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
\`\`\`
