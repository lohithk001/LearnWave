import { Server } from 'socket.io';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join user to their personal room
    socket.on('join-user', (userId: string) => {
      const roomName = `user-${userId}`;
      socket.join(roomName);
      console.log(`User ${userId} joined room ${roomName}`);
    });

    // Join resource updates room
    socket.on('join-resources', () => {
      socket.join('resources');
      console.log(`Client ${socket.id} joined resources room`);
    });

    // Handle messages
    socket.on('message', (msg: { text: string; senderId: string }) => {
      // Echo: broadcast message only the client who send the message
      socket.emit('message', {
        text: `Echo: ${msg.text}`,
        senderId: 'system',
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Send welcome message
    socket.emit('message', {
      text: 'Welcome to WebSocket Server!',
      senderId: 'system',
      timestamp: new Date().toISOString(),
    });
  });
};

// Export function to emit resource updates
export const emitResourceUpdate = (io: Server, eventType: 'upload' | 'delete' | 'update', resource: any) => {
  io.to('resources').emit('resource-updated', {
    type: eventType,
    resource,
    timestamp: new Date().toISOString()
  });

  if (eventType === 'upload') {
    io.to('resources').emit('resource-uploaded', { resource });
  } else if (eventType === 'delete') {
    const resourceId = typeof resource === 'string' ? resource : resource?.id;
    io.to('resources').emit('resource-deleted', { resourceId });
  }
  
  console.log(`Resource ${eventType} event broadcast to all connected clients`);
};
