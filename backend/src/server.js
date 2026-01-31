import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import 'colors';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import apiRoutes from './routes/apiRoutes.js';
import startCronJobs from './cron/syncJobs.js';
import syncRoutes from './routes/syncRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import atRiskRoutes from './routes/atRiskRoutes.js';
import silentRoutes from './routes/silentRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import sidebarRoutes from './routes/sidebarRoutes.js';

dotenv.config();

const startServer = async () => {
    try {
        // 1. Force Database Connection First
        await connectDB();

        const app = express();

        if (process.env.NODE_ENV === 'development') {
            app.use(morgan('dev'));
        }

        app.use(cors({
            origin: process.env.CORS_ORIGIN,
            credentials: true
        }));
        app.use(helmet());
        app.use(express.json());

        // Routes
        app.use('/api/debug', debugRoutes);
        app.use('/api', apiRoutes);
        app.use('/api', syncRoutes);
        app.use('/api/ai', aiRoutes);
        app.use('/api/at-risk', atRiskRoutes);
        app.use('/api/silent-students', silentRoutes);
        app.use('/api/dashboard', dashboardRoutes);
        app.use('/api/sidebar', sidebarRoutes);

        app.get('/', (req, res) => {
            res.send('API is running...');
        });

        app.use(notFound);
        app.use(errorHandler);

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`.yellow.bold);
            console.log(`[SYSTEM] Strict Scope Mode Active: Only courses.readonly and rosters.readonly are enabled.`);
        });

    } catch (error) {
        console.error(`FAILED TO START SERVER: ${error.message}`.red.bold);
        process.exit(1);
    }
};

startServer();
