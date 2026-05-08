import { Request, Response } from 'express';
import {
  analyzeFoodImageService,
  confirmFoodAnalysisService,
  deleteFoodAnalysisService,
  getFoodAnalysisByIdService,
  getFoodAnalysisHistoryService,
  getUserDashboardService,
  getUserMealHistoryService,
  getUserGoalsService,
  getUserMealsService,
  getUserProfileService,
  createMealService,
  reanalyzeFoodImageService,
  saveFoodAnalysisToMealLogService,
  searchFoodsService,
  updateMealService,
  updateUserGoalsService,
  updateUserProfileService,
  deleteMealService,
} from '../services/user.service';

const getAnalysisId = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

export const getUserProfile = async (req: Request, res: Response) => {
  const userProfile = await getUserProfileService(req.auth?.accountId);

  res.status(200).json({
    message: 'User profile fetched successfully',
    data: userProfile,
  });
};

export const getUserGoals = async (req: Request, res: Response) => {
  const userGoals = await getUserGoalsService(req.auth?.accountId);

  res.status(200).json({
    message: 'User goals fetched successfully',
    data: userGoals,
  });
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const updatedProfile = await updateUserProfileService(req.auth?.accountId, req.body);

  return res.status(200).json({
    message: 'User profile updated successfully',
    data: updatedProfile,
  });
};

export const updateUserGoals = async (req: Request, res: Response) => {
  const updatedGoals = await updateUserGoalsService(req.auth?.accountId, req.body);

  return res.status(200).json({
    message: 'User goals updated successfully',
    data: updatedGoals,
  });
};

export const getUserMeals = async (req: Request, res: Response) => {
  const userMeals = await getUserMealsService(req.auth?.accountId);

  res.status(200).json({
    message: 'User meals fetched successfully',
    data: userMeals,
  });
};

export const getUserMealHistory = async (req: Request, res: Response) => {
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  const dateFrom = typeof req.query.dateFrom === 'string'
    ? req.query.dateFrom
    : typeof req.query.from === 'string'
      ? req.query.from
      : undefined;
  const dateTo = typeof req.query.dateTo === 'string'
    ? req.query.dateTo
    : typeof req.query.to === 'string'
      ? req.query.to
      : undefined;
  const history = await getUserMealHistoryService(req.auth?.accountId, { limit, dateFrom, dateTo });

  return res.status(200).json({
    message: 'User meal history fetched successfully',
    data: history,
  });
};

export const getUserDashboard = async (req: Request, res: Response) => {
  const dashboard = await getUserDashboardService(req.auth?.accountId);

  return res.status(200).json({
    message: 'User dashboard fetched successfully',
    data: dashboard,
  });
};

export const searchFoods = async (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q : '';
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const foods = await searchFoodsService(query, { limit, category });

  return res.status(200).json({
    message: 'Foods fetched successfully',
    data: foods,
  });
};

export const createMeal = async (req: Request, res: Response) => {
  const { foodId, foodName, calories, mealType } = req.body;
  const parsedFoodId = Number(foodId) || 0;

  if (!mealType || (parsedFoodId <= 0 && (!foodName || typeof calories !== 'number'))) {
    return res.status(400).json({
      message: 'foodId or foodName/calories plus mealType are required',
    });
  }

  const meal = await createMealService(req.auth?.accountId, req.body);

  return res.status(201).json({
    message: 'Meal created successfully',
    data: meal,
  });
};

export const updateMeal = async (req: Request, res: Response) => {
  const mealId = Number(req.params.mealId);
  const meal = await updateMealService(req.auth?.accountId, mealId, req.body);

  if (!meal) {
    return res.status(404).json({
      message: 'Meal not found',
    });
  }

  return res.status(200).json({
    message: 'Meal updated successfully',
    data: meal,
  });
};

export const deleteMeal = async (req: Request, res: Response) => {
  const mealId = Number(req.params.mealId);
  const deleted = await deleteMealService(req.auth?.accountId, mealId);

  if (!deleted) {
    return res.status(404).json({
      message: 'Meal not found',
    });
  }

  return res.status(200).json({
    message: 'Meal deleted successfully',
  });
};

export const analyzeFoodImage = async (req: Request, res: Response) => {
  const { imageUrl, source } = req.body;

  if (!imageUrl || (source !== 'upload' && source !== 'camera')) {
    return res.status(400).json({
      message: 'imageUrl and a valid source are required',
    });
  }

  const analysis = await analyzeFoodImageService(req.auth?.accountId, { imageUrl, source });

  return res.status(201).json({
    message: 'Food image analyzed successfully',
    data: analysis,
  });
};

export const getFoodAnalysisHistory = async (req: Request, res: Response) => {
  const history = await getFoodAnalysisHistoryService(req.auth?.accountId);

  return res.status(200).json({
    message: 'Food analysis history fetched successfully',
    data: history,
  });
};

export const getFoodAnalysisById = async (req: Request, res: Response) => {
  const analysis = await getFoodAnalysisByIdService(req.auth?.accountId, getAnalysisId(req.params.analysisId));

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

export const confirmFoodAnalysis = async (req: Request, res: Response) => {
  const analysis = await confirmFoodAnalysisService(req.auth?.accountId, getAnalysisId(req.params.analysisId), req.body);

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

export const saveFoodAnalysisToMealLog = async (req: Request, res: Response) => {
  const analysis = await saveFoodAnalysisToMealLogService(req.auth?.accountId, getAnalysisId(req.params.analysisId));

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

export const reanalyzeFoodImage = async (req: Request, res: Response) => {
  const analysis = await reanalyzeFoodImageService(req.auth?.accountId, getAnalysisId(req.params.analysisId));

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

export const deleteFoodAnalysis = async (req: Request, res: Response) => {
  const deleted = await deleteFoodAnalysisService(req.auth?.accountId, getAnalysisId(req.params.analysisId));

  if (!deleted) {
    return res.status(404).json({
      message: 'Analysis result not found',
    });
  }

  return res.status(200).json({
    message: 'Analysis result deleted successfully',
  });
};
