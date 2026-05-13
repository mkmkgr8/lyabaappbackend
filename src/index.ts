import './config'; // validate env early
import express from 'express';
import http from 'http';
import { config } from './config';
import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';
import playersRouter from './routes/players';
import timeRouter from './routes/time';
import { errorHandler } from './middleware/errorHandler';
import { initWsServer } from './ws/wsServer';

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/players', playersRouter);
app.use('/api/time', timeRouter);

app.use(errorHandler);

const server = http.createServer(app);
initWsServer(server);

server.listen(config.PORT, () => {
  console.log(`Lyaba backend running on port ${config.PORT}`);
});
