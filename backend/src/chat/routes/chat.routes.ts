import { Router } from 'express';
import {
  deleteChatSessionController,
  getChatMessagesController,
  getChatSessionsController,
  sendChatMessageController,
} from '../controllers/chat.controller';

const router = Router();

router.post('/messages', sendChatMessageController);
router.get('/sessions', getChatSessionsController);
router.get('/sessions/:sessionId/messages', getChatMessagesController);
router.delete('/sessions/:sessionId', deleteChatSessionController);

export default router;
