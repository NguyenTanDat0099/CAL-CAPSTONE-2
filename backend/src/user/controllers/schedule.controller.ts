import { Request, Response } from 'express';
import {
  createScheduleService,
  deleteScheduleService,
  listDiscoverMealsService,
  listUserSchedulesService,
  publishScheduleService,
  updateScheduleService,
} from '../services/schedule.service';

const handleError = (err: unknown, res: Response) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  if (message === 'USER_NOT_FOUND') {
    return res.status(404).json({ message: 'User not found' });
  }
  if (message === 'SCHEDULE_NOT_FOUND') {
    return res.status(404).json({ message: 'Schedule not found' });
  }
  if (message === 'NAME_REQUIRED' || message === 'DATES_REQUIRED' || message === 'INVALID_DATE_RANGE') {
    return res.status(400).json({ message });
  }
  console.error('[ScheduleController]', err);
  return res.status(500).json({ message });
};

export const listSchedules = async (req: Request, res: Response) => {
  try {
    const data = await listUserSchedulesService(req.auth?.accountId);
    return res.status(200).json({ data });
  } catch (err) {
    return handleError(err, res);
  }
};

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const data = await createScheduleService(req.auth?.accountId, req.body);
    return res.status(201).json({ data });
  } catch (err) {
    return handleError(err, res);
  }
};

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const scheduleId = Number(req.params.scheduleId);
    if (!Number.isFinite(scheduleId)) {
      return res.status(400).json({ message: 'Invalid scheduleId' });
    }
    const data = await updateScheduleService(req.auth?.accountId, scheduleId, req.body);
    return res.status(200).json({ data });
  } catch (err) {
    return handleError(err, res);
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const scheduleId = Number(req.params.scheduleId);
    if (!Number.isFinite(scheduleId)) {
      return res.status(400).json({ message: 'Invalid scheduleId' });
    }
    const data = await deleteScheduleService(req.auth?.accountId, scheduleId);
    return res.status(200).json({ data });
  } catch (err) {
    return handleError(err, res);
  }
};

export const publishSchedule = async (req: Request, res: Response) => {
  try {
    const scheduleId = Number(req.params.scheduleId);
    if (!Number.isFinite(scheduleId)) {
      return res.status(400).json({ message: 'Invalid scheduleId' });
    }
    const publish = req.body?.publish !== false;
    const data = await publishScheduleService(req.auth?.accountId, scheduleId, publish);
    return res.status(200).json({ data });
  } catch (err) {
    return handleError(err, res);
  }
};

export const listDiscoverMeals = async (_req: Request, res: Response) => {
  try {
    const data = await listDiscoverMealsService();
    return res.status(200).json({ data });
  } catch (err) {
    return handleError(err, res);
  }
};
