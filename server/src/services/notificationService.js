import { v4 as uuidv4 } from 'uuid';

/**
 * Server-Sent Events (SSE) Real-Time Notification Service
 * Manages active HTTP streaming connections for instant client updates without polling.
 */
class NotificationService {
  constructor() {
    this.clients = new Map(); // clientId -> { id, userId, role, res }
    
    // Heartbeat every 25 seconds to prevent NAT/proxy timeouts
    setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  /**
   * Register a new SSE connection
   */
  addClient(userId, role, res) {
    const clientId = uuidv4();
    
    // Write SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

    const client = { id: clientId, userId, role, res };
    this.clients.set(clientId, client);

    console.log(`[NotificationService] Client connected: ${clientId} (User: ${userId}, Role: ${role}). Total active: ${this.clients.size}`);

    return clientId;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId) {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      console.log(`[NotificationService] Client disconnected: ${clientId}. Total active: ${this.clients.size}`);
    }
  }

  /**
   * Send heartbeat to keep connections alive
   */
  sendHeartbeat() {
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(`: heartbeat\n\n`);
      } catch (err) {
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Send event to a specific client response stream
   */
  sendToStream(res, eventName, data) {
    try {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Notify a specific user by user ID
   */
  notifyUser(userId, eventName, data) {
    let delivered = 0;
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId) {
        const success = this.sendToStream(client.res, eventName, {
          ...data,
          timestamp: new Date().toISOString()
        });
        if (success) delivered++;
        else this.removeClient(clientId);
      }
    }
    return delivered;
  }

  /**
   * Broadcast an event to all connected administrators and staff
   */
  notifyAdmins(eventName, data) {
    let delivered = 0;
    for (const [clientId, client] of this.clients.entries()) {
      if (client.role === 'ADMIN' || client.role === 'STAFF') {
        const success = this.sendToStream(client.res, eventName, {
          ...data,
          timestamp: new Date().toISOString()
        });
        if (success) delivered++;
        else this.removeClient(clientId);
      }
    }
    return delivered;
  }

  /**
   * Broadcast an event to every connected client
   */
  broadcast(eventName, data) {
    let delivered = 0;
    for (const [clientId, client] of this.clients.entries()) {
      const success = this.sendToStream(client.res, eventName, {
        ...data,
        timestamp: new Date().toISOString()
      });
      if (success) delivered++;
      else this.removeClient(clientId);
    }
    return delivered;
  }

  getActiveStats() {
    let admins = 0;
    let participants = 0;
    for (const client of this.clients.values()) {
      if (client.role === 'ADMIN' || client.role === 'STAFF') admins++;
      else participants++;
    }
    return {
      total: this.clients.size,
      admins,
      participants
    };
  }
}

export const notificationService = new NotificationService();
