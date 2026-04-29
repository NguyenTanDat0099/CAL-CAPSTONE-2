import { Router } from 'express';
import {
  deleteChatSession,
  getChatMessages,
  getChatSessions,
  sendChatMessage,
} from '../controllers/chat.controller';

const chatRouter = Router();

chatRouter.get('/sessions', getChatSessions);
chatRouter.get('/sessions/:sessionId/messages', getChatMessages);
chatRouter.delete('/sessions/:sessionId', deleteChatSession);
chatRouter.post('/message', sendChatMessage);

export default chatRouter;
