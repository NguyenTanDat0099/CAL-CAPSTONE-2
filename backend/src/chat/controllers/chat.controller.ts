import { Request, Response } from 'express';
import {
  deleteChatSessionService,
  getChatMessagesService,
  getChatSessionsService,
  sendChatMessageService,
  truncateMessagesAfterService,
} from '../services/chat.service';

const statusByError: Record<string, number> = {
  USER_NOT_FOUND: 404,
  CHAT_SESSION_NOT_FOUND: 404,
  CHAT_MESSAGE_NOT_FOUND: 404,
  EMPTY_MESSAGE: 400,
  INVALID_IMAGE: 400,
  IMAGE_TOO_LARGE: 413,
};

const handleChatError = (error: unknown, res: Response) => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  return res.status(statusByError[message] ?? 500).json({ message });
};

const parseSessionId = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getChatSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await getChatSessionsService(req.auth?.accountId);
    return res.status(200).json({
      message: 'Chat sessions fetched successfully',
      data: sessions,
    });
  } catch (error) {
    return handleChatError(error, res);
  }
};

export const getChatMessages = async (req: Request, res: Response) => {
  const sessionId = parseSessionId(req.params.sessionId);
  if (!sessionId) {
    return res.status(400).json({ message: 'INVALID_SESSION_ID' });
  }

  try {
    const messages = await getChatMessagesService(req.auth?.accountId, sessionId);
    return res.status(200).json({
      message: 'Chat messages fetched successfully',
      data: messages,
    });
  } catch (error) {
    return handleChatError(error, res);
  }
};

export const sendChatMessage = async (req: Request, res: Response) => {
  const { message, sessionId, imageUrl, imageName, contextImageUrl, contextImageName } = req.body;
  const hasMessage = typeof message === 'string' && message.trim().length > 0;
  const hasImage = typeof imageUrl === 'string' && imageUrl.trim().length > 0;

  if (!hasMessage && !hasImage) {
    return res.status(400).json({ message: 'EMPTY_MESSAGE' });
  }

  const parsedSessionId = sessionId === undefined || sessionId === null ? null : parseSessionId(sessionId);
  if (sessionId !== undefined && sessionId !== null && !parsedSessionId) {
    return res.status(400).json({ message: 'INVALID_SESSION_ID' });
  }

  try {
    const result = await sendChatMessageService(req.auth?.accountId, {
      message: typeof message === 'string' ? message : '',
      sessionId: parsedSessionId,
      imageUrl: hasImage ? imageUrl : null,
      imageName: typeof imageName === 'string' ? imageName : null,
      contextImageUrl: typeof contextImageUrl === 'string' ? contextImageUrl : null,
      contextImageName: typeof contextImageName === 'string' ? contextImageName : null,
    });

    return res.status(200).json({
      message: 'Chat message sent successfully',
      data: result,
    });
  } catch (error) {
    return handleChatError(error, res);
  }
};

export const truncateMessagesAfter = async (req: Request, res: Response) => {
  const sessionId = parseSessionId(req.params.sessionId);
  const messageId = Number(req.params.messageId);
  if (!sessionId || !Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({ message: 'INVALID_PARAMS' });
  }
  const inclusive = String(req.query.inclusive ?? '').toLowerCase() === 'true';

  try {
    const result = await truncateMessagesAfterService(
      req.auth?.accountId,
      sessionId,
      messageId,
      { inclusive }
    );
    return res.status(200).json({
      message: 'Messages truncated',
      data: result,
    });
  } catch (error) {
    return handleChatError(error, res);
  }
};

export const deleteChatSession = async (req: Request, res: Response) => {
  const sessionId = parseSessionId(req.params.sessionId);
  if (!sessionId) {
    return res.status(400).json({ message: 'INVALID_SESSION_ID' });
  }

  try {
    const result = await deleteChatSessionService(req.auth?.accountId, sessionId);
    return res.status(200).json({
      message: 'Chat session deleted successfully',
      data: result,
    });
  } catch (error) {
    return handleChatError(error, res);
  }
};
