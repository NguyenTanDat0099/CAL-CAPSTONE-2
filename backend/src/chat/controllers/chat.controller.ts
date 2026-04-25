import { Request, Response } from 'express';
import {
  deleteChatSession,
  sendChatMessage,
  getChatSessions,
  getChatMessages,
} from '../services/chat.service';

const getUserId = (req: Request) => {
  const value = req.auth?.accountId ?? req.query.accountId ?? req.body.accountId;
  return Number(value);
};

export const sendChatMessageController = async (req: Request, res: Response) => {
  const { message, sessionId } = req.body;
  const accountId = getUserId(req);

  if (!accountId || !message) {
    return res.status(400).json({ message: 'accountId and message are required' });
  }

  try {
    const response = await sendChatMessage(accountId, message, sessionId);
    return res.status(200).json({
      message: 'Chat message sent successfully',
      data: response,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send message' });
  }
};

export const getChatSessionsController = async (req: Request, res: Response) => {
  const accountId = getUserId(req);

  if (!accountId) {
    return res.status(400).json({ message: 'accountId is required' });
  }

  try {
    const response = await getChatSessions(accountId);
    return res.status(200).json({
      message: 'Chat sessions fetched successfully',
      data: response,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve chat sessions' });
  }
};

export const getChatMessagesController = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const accountId = getUserId(req);

  if (!accountId) {
    return res.status(400).json({ message: 'accountId is required' });
  }

  try {
    const response = await getChatMessages(accountId, Number(sessionId));
    return res.status(200).json({
      message: 'Chat messages fetched successfully',
      data: response,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve chat messages' });
  }
};

export const deleteChatSessionController = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const accountId = getUserId(req);

  if (!accountId) {
    return res.status(400).json({ message: 'accountId is required' });
  }

  try {
    const response = await deleteChatSession(accountId, Number(sessionId));
    return res.status(200).json({
      message: 'Chat session deleted successfully',
      data: response,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete chat session' });
  }
};
