import express from 'express';
import cors from 'cors';
import issueRoutes from './routes/issues.js';
import verifyRoutes from './routes/verify.js';
import claimRoutes from './routes/claims.js';
import historyRoutes from './routes/history.js';
import analyticsRoutes from './routes/analytics.js';
import demoRoutes from './routes/demo.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/issues', issueRoutes);
app.use('/api/issues', verifyRoutes);
app.use('/api/issues', claimRoutes);
app.use('/api/issues', historyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/issues', demoRoutes);

app.listen(3001, () => console.log('Backend running on :3001'));
