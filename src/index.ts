import "dotenv/config"
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { UserRouter } from './routes/userRoutes';
import { PORT } from './config';
import { NoticeRouter } from './routes/noticeRoutes';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth/user", UserRouter);
app.use("/api/notices", NoticeRouter);

// Health Check
app.get('/', (req, res) => {
  res.send('TPCN Server is up and running!');
});
    
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});