import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { connectDB } from './server/db/connection';
import { seedDatabase } from './server/services/seedService';
import { initSocketIO } from './server/socket';

// Route imports
import authRoutes from './server/routes/authRoutes';
import adminRoutes from './server/routes/adminRoutes';
import internRoutes from './server/routes/internRoutes';
import projectRoutes from './server/routes/projectRoutes';
import assignmentRoutes from './server/routes/assignmentRoutes';
import reportRoutes from './server/routes/reportRoutes';
import reportingCalendarRoutes from './server/routes/reportingCalendarRoutes';
import notificationRoutes from './server/routes/notificationRoutes';
import exportRoutes from './server/routes/exportRoutes';
import fileRoutes from './server/routes/fileRoutes';
import emailRoutes from './server/routes/emailRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Socket.IO gateway
initSocketIO(server);

// Mount REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/interns', internRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reporting', reportingCalendarRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/emails', emailRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    system: 'NexusProject Full-Stack Server',
    database: 'MongoDB GridFS Operational',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    // 1. Connect to MongoDB (or embedded engine)
    await connectDB();

    // 2. Seed initial 2 Admin accounts, Interns, Projects, and Reports
    try {
      await seedDatabase();
    } catch (seedErr: any) {
      console.warn('[Seed] Warning during initial database seeding:', seedErr?.message || seedErr);
    }

    // 3. Mount Vite in development or static dist in production
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Vite] Mounted Vite development middleware.');
    } else {
      const distPath = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
      console.log('[Server] Serving production build from dist folder.');
    }

    // 4. Start HTTP & WebSocket Server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`🚀 NexusProject Full-Stack Server running on port ${PORT}`);
      console.log(`   Connected to MongoDB & GridFS storage bucket`);
      console.log(`   Real-time Socket.IO gateway active`);
      console.log(`====================================================`);
    });
  } catch (err: any) {
    console.error('Fatal error starting NexusProject server:', err);
    process.exit(1);
  }
}

startServer();
