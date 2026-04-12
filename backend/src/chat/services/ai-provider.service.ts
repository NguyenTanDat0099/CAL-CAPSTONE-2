interface ChatUserContext {
  profile: {
    fullName: string | null;
    gender: string | null;
    height: number | null;
    weight: number | null;
  };
  goals: {
    targetCalories: number | null;
    targetWeight: number | null;
  } | null;
  dailySummary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  } | null;
  recentMeals: Array<{
    mealType: string;
    foodName: string;
    calories: number;
  }>;
}

export const generateAiReply = async (message: string, context: ChatUserContext) => {
  const recentMealText =
    context.recentMeals.length > 0
      ? context.recentMeals.map(meal => `${meal.mealType}: ${meal.foodName} (${meal.calories} kcal)`).join(', ')
      : 'No recent meals logged.';

  const targetCalories = context.goals?.targetCalories ?? 2200;
  const consumedCalories = context.dailySummary?.totalCalories ?? 0;

  return `CalAI assistant: I received your question "${message}". Your current target is ${targetCalories} kcal/day and you have consumed ${consumedCalories} kcal today. Recent meals: ${recentMealText}`;
};
