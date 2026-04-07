import { Request, Response } from 'express';
import {
  getUserProfileService,
  getUserGoalsService,
  getUserMealsService,
  analyzeFoodImageService,
  getFoodAnalysisHistoryService,
  getFoodAnalysisByIdService,
  confirmFoodAnalysisService,
  saveFoodAnalysisToMealLogService,
  reanalyzeFoodImageService,
  deleteFoodAnalysisService,
} from '../services/user.service';

export const getUserProfile = (req: Request, res: Response) => {
  const userProfile = getUserProfileService();

  res.status(200).json({
    message: 'User profile fetched successfully',
    data: userProfile,
  });
};

export const getUserGoals = (req: Request, res: Response) => {
  const userGoals = getUserGoalsService();

  res.status(200).json({
    message: 'User goals fetched successfully',
    data: userGoals,
  });
};

export const getUserMeals = (req: Request, res: Response) => {
  const userMeals = getUserMealsService();

  res.status(200).json({
    message: 'User meals fetched successfully',
    data: userMeals,
  });
};

export const analyzeFoodImage = (req: Request, res: Response) => {
  const { imageUrl, source } = req.body;

  if (!imageUrl || !source) {
    return res.status(400).json({
      message: 'imageUrl and source are required',
    });
  }

  const analysis = analyzeFoodImageService({ imageUrl, source });

  return res.status(201).json({
    message: 'Food image analyzed successfully',
    data: analysis,
  });
};

export const getFoodAnalysisHistory = (req: Request, res: Response) => {
  const history = getFoodAnalysisHistoryService();

  return res.status(200).json({
    message: 'Food analysis history fetched successfully',
    data: history,
  });
};

export const getFoodAnalysisById = (req: Request, res: Response) => {
  const analysis = getFoodAnalysisByIdService(req.params.analysisId);

  if (!analysis) {
    return res.status(404).json({
      message: 'Analysis result not found',
    });
  }

  return res.status(200).json({
    message: 'Food analysis fetched successfully',
    data: analysis,
  });
};

export const confirmFoodAnalysis = (req: Request, res: Response) => {
  const analysis = confirmFoodAnalysisService(req.params.analysisId, req.body);

  if (!analysis) {
    return res.status(404).json({
      message: 'Analysis result not found',
    });
  }

  return res.status(200).json({
    message: 'Food analysis confirmed successfully',
    data: analysis,
  });
};

export const saveFoodAnalysisToMealLog = (req: Request, res: Response) => {
  const analysis = saveFoodAnalysisToMealLogService(req.params.analysisId);

  if (!analysis) {
    return res.status(404).json({
      message: 'Analysis result not found',
    });
  }

  return res.status(200).json({
    message: 'Food analysis saved to meal log successfully',
    data: analysis,
  });
};

export const reanalyzeFoodImage = (req: Request, res: Response) => {
  const analysis = reanalyzeFoodImageService(req.params.analysisId);

  if (!analysis) {
    return res.status(404).json({
      message: 'Analysis result not found',
    });
  }

  return res.status(200).json({
    message: 'Food image reanalyzed successfully',
    data: analysis,
  });
};

export const deleteFoodAnalysis = (req: Request, res: Response) => {
  const deleted = deleteFoodAnalysisService(req.params.analysisId);

  if (!deleted) {
    return res.status(404).json({
      message: 'Analysis result not found',
    });
  }

  return res.status(200).json({
    message: 'Analysis result deleted successfully',
  });
};
