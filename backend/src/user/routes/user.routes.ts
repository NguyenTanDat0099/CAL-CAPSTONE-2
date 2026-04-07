import { Router } from 'express';
import {
  getUserProfile,
  getUserGoals,
  getUserMeals,
  analyzeFoodImage,
  getFoodAnalysisHistory,
  getFoodAnalysisById,
  confirmFoodAnalysis,
  saveFoodAnalysisToMealLog,
  reanalyzeFoodImage,
  deleteFoodAnalysis,
} from '../controllers/user.controller';

const userRouter = Router();

userRouter.get('/profile', getUserProfile);
userRouter.get('/goals', getUserGoals);
userRouter.get('/meals', getUserMeals);
userRouter.get('/food-analysis/history', getFoodAnalysisHistory);
userRouter.get('/food-analysis/:analysisId', getFoodAnalysisById);
userRouter.post('/food-analysis/analyze', analyzeFoodImage);
userRouter.patch('/food-analysis/:analysisId/confirm', confirmFoodAnalysis);
userRouter.post('/food-analysis/:analysisId/save', saveFoodAnalysisToMealLog);
userRouter.post('/food-analysis/:analysisId/reanalyze', reanalyzeFoodImage);
userRouter.delete('/food-analysis/:analysisId', deleteFoodAnalysis);

export default userRouter;
