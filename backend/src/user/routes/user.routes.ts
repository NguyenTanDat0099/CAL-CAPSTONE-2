import { Router } from 'express';
import {
  analyzeFoodImage,
  confirmFoodAnalysis,
  createMeal,
  saveFoodAnalysisToMealLog,
  deleteMeal,
  reanalyzeFoodImage,
  deleteFoodAnalysis,
  getFoodAnalysisById,
  getFoodAnalysisHistory,
  getUserDashboard,
  getUserGoals,
  getUserMealHistory,
  getUserMeals,
  getUserProfile,
  searchFoods,
  updateMeal,
  updateUserGoals,
  updateUserProfile,
} from '../controllers/user.controller';

const userRouter = Router();

userRouter.get('/profile', getUserProfile);
userRouter.patch('/profile', updateUserProfile);
userRouter.get('/goals', getUserGoals);
userRouter.patch('/goals', updateUserGoals);
userRouter.get('/dashboard', getUserDashboard);
userRouter.get('/meals', getUserMeals);
userRouter.get('/meals/history', getUserMealHistory);
userRouter.post('/meals', createMeal);
userRouter.patch('/meals/:mealId', updateMeal);
userRouter.delete('/meals/:mealId', deleteMeal);
userRouter.get('/foods/search', searchFoods);
userRouter.get('/food-analysis/history', getFoodAnalysisHistory);
userRouter.get('/food-analysis/:analysisId', getFoodAnalysisById);
userRouter.post('/food-analysis/analyze', analyzeFoodImage);
userRouter.patch('/food-analysis/:analysisId/confirm', confirmFoodAnalysis);
userRouter.post('/food-analysis/:analysisId/save', saveFoodAnalysisToMealLog);
userRouter.post('/food-analysis/:analysisId/reanalyze', reanalyzeFoodImage);
userRouter.delete('/food-analysis/:analysisId', deleteFoodAnalysis);

export default userRouter;
