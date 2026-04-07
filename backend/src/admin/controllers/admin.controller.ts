import { Request, Response } from 'express';
import {
  getAdminProfileService,
  getAdminStatsService,
  getAllUsersService,
} from '../services/admin.service';

export const getAdminProfile = (req: Request, res: Response) => {
  const adminProfile = getAdminProfileService();

  res.status(200).json({
    message: 'Admin profile fetched successfully',
    data: adminProfile,
  });
};

export const getAdminStats = (req: Request, res: Response) => {
  const adminStats = getAdminStatsService();

  res.status(200).json({
    message: 'Admin stats fetched successfully',
    data: adminStats,
  });
};

export const getAllUsers = (req: Request, res: Response) => {
  const users = getAllUsersService();

  res.status(200).json({
    message: 'Users fetched successfully',
    data: users,
  });
};