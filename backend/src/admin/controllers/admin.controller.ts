import { Request, Response } from 'express';
import {
  getAdminProfileService,
  getAdminStatsService,
  getAllUsersService,
} from '../services/admin.service';

export const getAdminProfile = async (req: Request, res: Response) => {
  const adminProfile = await getAdminProfileService();

  res.status(200).json({
    message: 'Admin profile fetched successfully',
    data: adminProfile,
  });
};

export const getAdminStats = async (req: Request, res: Response) => {
  const adminStats = await getAdminStatsService();

  res.status(200).json({
    message: 'Admin stats fetched successfully',
    data: adminStats,
  });
};

export const getAllUsers = async (req: Request, res: Response) => {
  const users = await getAllUsersService();

  res.status(200).json({
    message: 'Users fetched successfully',
    data: users,
  });
};
