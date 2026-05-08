import { Request, Response } from 'express';
import {
  listFoodPreferencesService,
  upsertFoodPreferenceService,
  deleteFoodPreferenceService,
  PreferenceType,
  PreferenceMealSlot,
} from '../services/foodPreferences.service';

const VALID_TYPES: PreferenceType[] = ['favorite', 'avoided', 'disliked', 'allergy'];
const VALID_SLOTS: PreferenceMealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack', 'beverage', 'any'];

export const listFoodPreferences = async (req: Request, res: Response) => {
  const data = await listFoodPreferencesService(req.auth?.accountId);
  res.status(200).json({ message: 'Food preferences fetched', data });
};

export const upsertFoodPreference = async (req: Request, res: Response) => {
  const { foodName, type, mealSlot, note, weight } = req.body ?? {};

  if (typeof foodName !== 'string' || !foodName.trim()) {
    return res.status(400).json({ message: 'foodName is required' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ message: `type must be one of ${VALID_TYPES.join(', ')}` });
  }
  const slot: PreferenceMealSlot = VALID_SLOTS.includes(mealSlot) ? mealSlot : 'any';
  const weightValue =
    typeof weight === 'number' && Number.isFinite(weight) ? Math.max(0.1, Math.min(5, weight)) : 1.0;

  const result = await upsertFoodPreferenceService(req.auth?.accountId, {
    foodName: foodName.trim().slice(0, 255),
    type,
    mealSlot: slot,
    note: typeof note === 'string' ? note.slice(0, 500) : null,
    weight: weightValue,
  });

  if (!result) return res.status(404).json({ message: 'User not found' });
  res.status(200).json({ message: 'Food preference saved', data: result });
};

export const deleteFoodPreference = async (req: Request, res: Response) => {
  const id = Number(req.params.preferenceId);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid preferenceId' });
  }
  const ok = await deleteFoodPreferenceService(req.auth?.accountId, id);
  if (!ok) return res.status(404).json({ message: 'Preference not found' });
  res.status(200).json({ message: 'Food preference deleted' });
};
