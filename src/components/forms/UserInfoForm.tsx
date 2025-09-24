'use client';

import { useState, useEffect } from 'react';
import { UserInfo, FormErrors } from '@/lib/types';

const PROTEIN_SOURCES = [
  '鶏むね肉', '鶏もも肉', 'ささみ', '豚ヒレ肉', '豚ロース肉', 
  '牛もも肉', '牛ヒレ肉', 'サーモン', 'マグロ', '卵', 
  '豆腐', '納豆', 'プロテインパウダー'
];

const COMMON_ALLERGIES = [
  '卵', '乳', '小麦', '大豆', 'ピーナッツ', 'えび', 'かに', 
  'そば', 'ゴマ', '魚', '鶏肉', '豚肉', '牛肉'
];

export default function UserInfoForm() {
  const [userInfo, setUserInfo] = useState<Partial<UserInfo>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFallbackMessage, setShowFallbackMessage] = useState(false);
  const [_isLoaded, setIsLoaded] = useState(false);

  // SessionStorageからの読み込み
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.sessionStorage.getItem('userInfo');
        if (item) {
          const parsedValue = JSON.parse(item);
          console.log('SessionStorage読み込み完了 - userInfo:', parsedValue);
          setUserInfo(parsedValue);
        } else {
          console.log('SessionStorage - userInfo: データなし');
        }
        setIsLoaded(true);
      }
    } catch (error) {
      console.error('Error reading sessionStorage key "userInfo":', error);
      setIsLoaded(true);
    }
  }, []);

  // SessionStorageへの保存
  const saveToSessionStorage = (newUserInfo: Partial<UserInfo>) => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('userInfo', JSON.stringify(newUserInfo));
        console.log('SessionStorage保存完了 - userInfo:', newUserInfo);
      }
    } catch (error) {
      console.error('Error saving to sessionStorage:', error);
    }
  };

  const validateForm = (data: Partial<UserInfo>): FormErrors => {
    const newErrors: FormErrors = {};

    console.log('バリデーション対象データ:', data);

    // 必須項目チェック
    if (!data.height || isNaN(data.height) || data.height < 100 || data.height > 250) {
      newErrors.height = '身長は100-250cmの範囲で入力してください';
    }
    if (!data.weight || isNaN(data.weight) || data.weight < 30 || data.weight > 200) {
      newErrors.weight = '体重は30-200kgの範囲で入力してください';
    }
    if (!data.age || isNaN(data.age) || data.age < 10 || data.age > 100) {
      newErrors.age = '年齢は10-100歳の範囲で入力してください';
    }
    if (!data.gender) {
      newErrors.gender = '性別を選択してください';
    }
    if (!data.bodyFatPercentage || isNaN(data.bodyFatPercentage) || data.bodyFatPercentage < 5 || data.bodyFatPercentage > 50) {
      newErrors.bodyFatPercentage = '体脂肪率は5-50%の範囲で入力してください';
    }
    if (!data.targetWeight || isNaN(data.targetWeight) || data.targetWeight < 30 || data.targetWeight > 200) {
      newErrors.targetWeight = '目標体重は30-200kgの範囲で入力してください';
    }
    if (data.exerciseFrequency === undefined || isNaN(data.exerciseFrequency) || data.exerciseFrequency < 0 || data.exerciseFrequency > 14) {
      newErrors.exerciseFrequency = '運動頻度は0-14回/週の範囲で入力してください';
    }

    // PFCバランスチェック（入力された場合）
    if (data.pfcBalance) {
      const { protein, fat, carbs } = data.pfcBalance;
      if (protein + fat + carbs !== 100) {
        newErrors.pfcBalance = 'PFCバランスの合計は100%である必要があります';
      }
    }

    // 目標設定方法のバリデーション
    if (data.goalSettingMethod === 'duration') {
      if (!data.targetDurationWeeks || data.targetDurationWeeks < 1 || data.targetDurationWeeks > 104) {
        newErrors.targetDurationWeeks = '目標期間は1-104週の範囲で入力してください';
      }
    }
    
    if (data.goalSettingMethod === 'calories') {
      if (!data.targetDailyCalories || data.targetDailyCalories < 800 || data.targetDailyCalories > 8000) {
        newErrors.targetDailyCalories = '摂取カロリーは800-8000kcalの範囲で入力してください';
      }
    }

    // 目標設定の妥当性検証（必要なフィールドが揃っている場合）
    if (data.height && data.weight && data.age && data.gender && data.exerciseFrequency !== undefined && data.targetWeight) {
      try {
        const { validateGoalSettings } = require('@/lib/nutrition-calculator');
        const validation = validateGoalSettings(data as UserInfo);
        if (!validation.isValid) {
          validation.errors.forEach((error: string, index: number) => {
            newErrors[`goalValidation${index}` as keyof FormErrors] = error;
          });
        }
      } catch (error) {
        console.warn('目標設定の妥当性検証に失敗:', error);
      }
    }

    console.log('バリデーションエラー:', newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    console.log('フォーム送信開始:', userInfo);

    const formErrors = validateForm(userInfo);
    console.log('バリデーション結果:', formErrors);
    
    if (Object.keys(formErrors).length > 0) {
      console.log('バリデーションエラーがあります:', formErrors);
      setErrors(formErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // セッションストレージに保存
      console.log('セッションストレージに保存中...');
      saveToSessionStorage(userInfo);
      
      // 保存完了を確認するため少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 保存されたデータを確認
      const savedData = sessionStorage.getItem('userInfo');
      console.log('保存されたデータ:', savedData ? JSON.parse(savedData) : null);
      
      // 結果ページに遷移
      console.log('結果ページに遷移中...');
      
      // Hot Reloadの影響を避けるため、より確実な方法で遷移
      setTimeout(() => {
        console.log('タイマー経由で遷移実行');
        window.location.href = '/results';
      }, 200);
      
      // 3秒後にフォールバックメッセージを表示
      setTimeout(() => {
        setShowFallbackMessage(true);
        setIsSubmitting(false);
      }, 3000);
      
      console.log('遷移処理スケジュール完了');
    } catch (error) {
      console.error('遷移エラー:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateUserInfo = (field: keyof UserInfo, value: any) => {
    console.log(`updateUserInfo called: ${field} = ${value}`);
    setUserInfo((prev: Partial<UserInfo>) => {
      const newUserInfo = { ...prev };
      
      // 明示的にフィールドを設定
      if (value === undefined) {
        delete (newUserInfo as any)[field];
      } else {
        (newUserInfo as any)[field] = value;
      }
      
      console.log('Previous userInfo:', prev);
      console.log('New userInfo:', newUserInfo);
      console.log(`Field ${field} set to:`, (newUserInfo as any)[field]);
      
      // SessionStorageに保存
      saveToSessionStorage(newUserInfo);
      
      return newUserInfo;
    });
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const updatePFC = (field: 'protein' | 'fat' | 'carbs', value: string) => {
    const currentPFC = userInfo.pfcBalance || { protein: 30, fat: 25, carbs: 45 };
    const numValue = value === '' ? 0 : parseInt(value);
    const newPFC = { ...currentPFC, [field]: numValue };
    updateUserInfo('pfcBalance', newPFC);
  };

  const toggleProteinSource = (source: string) => {
    const current = userInfo.proteinSources || [];
    const updated = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source];
    updateUserInfo('proteinSources', updated);
  };

  const toggleAllergy = (allergy: string) => {
    const current = userInfo.allergies || [];
    const updated = current.includes(allergy)
      ? current.filter(a => a !== allergy)
      : [...current, allergy];
    updateUserInfo('allergies', updated);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        MacroFit Pro - ユーザー情報入力 🏋️‍♂️
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本情報セクション */}
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">基本情報（必須）</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 身長 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                身長 (cm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={userInfo.height || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updateUserInfo('height', value === '' ? undefined : parseFloat(value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="170"
              />
              {errors.height && <p className="text-red-500 text-sm mt-1">{errors.height}</p>}
            </div>

            {/* 体重 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現在の体重 (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={userInfo.weight || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updateUserInfo('weight', value === '' ? undefined : parseFloat(value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="70"
              />
              {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
            </div>

            {/* 年齢 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                年齢 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={userInfo.age || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updateUserInfo('age', value === '' ? undefined : parseInt(value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="25"
                min="10"
                max="100"
              />
              {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
            </div>

            {/* 性別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                性別 <span className="text-red-500">*</span>
              </label>
              <select
                value={userInfo.gender || ''}
                onChange={(e) => updateUserInfo('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
              </select>
              {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
            </div>

            {/* 体脂肪率 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                体脂肪率 (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={userInfo.bodyFatPercentage || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updateUserInfo('bodyFatPercentage', value === '' ? undefined : parseFloat(value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="15"
              />
              {errors.bodyFatPercentage && <p className="text-red-500 text-sm mt-1">{errors.bodyFatPercentage}</p>}
            </div>

            {/* 運動頻度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                運動頻度 (回/週) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={userInfo.exerciseFrequency || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updateUserInfo('exerciseFrequency', value === '' ? undefined : parseInt(value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3"
              />
              {errors.exerciseFrequency && <p className="text-red-500 text-sm mt-1">{errors.exerciseFrequency}</p>}
            </div>

            {/* 目標体重 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目標体重 (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={userInfo.targetWeight || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  updateUserInfo('targetWeight', value === '' ? undefined : parseFloat(value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="75"
              />
              {errors.targetWeight && <p className="text-red-500 text-sm mt-1">{errors.targetWeight}</p>}
            </div>
          </div>

          {/* 目標設定方法 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              目標設定方法 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-4">
              {/* 期間指定 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="goalSettingMethod"
                    value="duration"
                    checked={userInfo.goalSettingMethod === 'duration'}
                    onChange={(_e) => {
                      console.log('期間指定ラジオボタンがクリックされました');
                      console.log('Current goalSettingMethod:', userInfo.goalSettingMethod);
                      console.log('Checked state:', userInfo.goalSettingMethod === 'duration');
                      updateUserInfo('goalSettingMethod', 'duration');
                      updateUserInfo('targetDailyCalories', undefined);
                    }}
                    className="mr-3"
                  />
                  <span className="font-medium">期間を指定して摂取カロリーを計算</span>
                </label>
                <p className="text-sm text-gray-600 mt-1 ml-6">
                  目標体重までの期間を設定し、必要な1日摂取カロリーを自動計算
                </p>
                {userInfo.goalSettingMethod === 'duration' && (
                  <div className="mt-3 ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      目標達成期間 (週)
                    </label>
                    <input
                      type="number"
                      value={userInfo.targetDurationWeeks || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateUserInfo('targetDurationWeeks', value === '' ? undefined : parseInt(value));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12"
                      min="1"
                      max="104"
                    />
                    <p className="text-xs text-gray-500 mt-1">1-104週（2年）の範囲で設定</p>
                    {errors.targetDurationWeeks && <p className="text-red-500 text-sm mt-1">{errors.targetDurationWeeks}</p>}
                  </div>
                )}
              </div>

              {/* カロリー指定 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="goalSettingMethod"
                    value="calories"
                    checked={userInfo.goalSettingMethod === 'calories'}
                    onChange={(_e) => {
                      console.log('カロリー指定ラジオボタンがクリックされました');
                      console.log('Current goalSettingMethod:', userInfo.goalSettingMethod);
                      console.log('Checked state:', userInfo.goalSettingMethod === 'calories');
                      updateUserInfo('goalSettingMethod', 'calories');
                      updateUserInfo('targetDurationWeeks', undefined);
                    }}
                    className="mr-3"
                  />
                  <span className="font-medium">摂取カロリーを指定して期間を計算</span>
                </label>
                <p className="text-sm text-gray-600 mt-1 ml-6">
                  1日の摂取カロリーを設定し、目標達成までの期間を自動計算
                </p>
                {userInfo.goalSettingMethod === 'calories' && (
                  <div className="mt-3 ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      1日摂取カロリー (kcal)
                    </label>
                    <input
                      type="number"
                      value={userInfo.targetDailyCalories || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateUserInfo('targetDailyCalories', value === '' ? undefined : parseInt(value));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2000"
                      min="800"
                      max="8000"
                    />
                    <p className="text-xs text-gray-500 mt-1">800-8000kcalの範囲で設定</p>
                    {errors.targetDailyCalories && <p className="text-red-500 text-sm mt-1">{errors.targetDailyCalories}</p>}
                  </div>
                )}
              </div>

              {/* 自動計算（デフォルト） */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="goalSettingMethod"
                    value=""
                    checked={!userInfo.goalSettingMethod}
                    onChange={(_e) => {
                      console.log('自動計算ラジオボタンがクリックされました');
                      console.log('Current goalSettingMethod:', userInfo.goalSettingMethod);
                      console.log('Checked state:', !userInfo.goalSettingMethod);
                      updateUserInfo('goalSettingMethod', undefined);
                      updateUserInfo('targetDurationWeeks', undefined);
                      updateUserInfo('targetDailyCalories', undefined);
                    }}
                    className="mr-3"
                  />
                  <span className="font-medium">自動計算（推奨）</span>
                </label>
                <p className="text-sm text-gray-600 mt-1 ml-6">
                  健康的な体重変化率に基づいて自動でカロリーと期間を計算
                </p>
              </div>
            </div>

            {/* 目標設定の妥当性エラー表示 */}
            {Object.keys(errors).some(key => key.startsWith('goalValidation')) && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-red-800 font-medium mb-2">⚠️ 目標設定に問題があります</h4>
                <ul className="text-red-700 text-sm space-y-1">
                  {Object.entries(errors)
                    .filter(([key]) => key.startsWith('goalValidation'))
                    .map(([key, error]) => (
                      <li key={key}>• {error}</li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 任意設定セクション */}
        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-green-900">詳細設定（任意）</h2>

          {/* PFCバランス */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PFCバランス (%)
            </label>
            <p className="text-sm text-gray-500 mb-3">
              デフォルト: タンパク質30%、脂質25%、炭水化物45%
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">タンパク質</label>
                <input
                  type="number"
                  value={userInfo.pfcBalance?.protein || 30}
                  onChange={(e) => updatePFC('protein', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">脂質</label>
                <input
                  type="number"
                  value={userInfo.pfcBalance?.fat || 25}
                  onChange={(e) => updatePFC('fat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">炭水化物</label>
                <input
                  type="number"
                  value={userInfo.pfcBalance?.carbs || 45}
                  onChange={(e) => updatePFC('carbs', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            {errors.pfcBalance && <p className="text-red-500 text-sm mt-1">{errors.pfcBalance}</p>}
          </div>

          {/* プロテイン摂取回数 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              プロテイン摂取回数/日（30g/回）
            </label>
            <select
              value={(userInfo as any).proteinIntakeFrequency || 0}
              onChange={(e) => updateUserInfo('proteinIntakeFrequency' as keyof UserInfo, parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={0}>0回（なし）</option>
              <option value={1}>1回</option>
              <option value={2}>2回</option>
              <option value={3}>3回</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              プロテインパウダー30gの摂取回数を選択してください
            </p>
          </div>

          {/* 朝食の主食 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              朝食の主食
            </label>
            <select
              value={(userInfo as any).breakfastStaple || '食パン'}
              onChange={(e) => updateUserInfo('breakfastStaple' as keyof UserInfo, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="食パン">食パン</option>
              <option value="白米">白米</option>
              <option value="オートミール">オートミール</option>
              <option value="玄米">玄米</option>
            </select>
          </div>

          {/* タンパク質源 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              好みのタンパク質源（複数選択可）
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PROTEIN_SOURCES.map((source) => (
                <label key={source} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(userInfo.proteinSources || []).includes(source)}
                    onChange={() => toggleProteinSource(source)}
                    className="mr-2"
                  />
                  <span className="text-sm">{source}</span>
                </label>
              ))}
            </div>
          </div>

          {/* アレルギー */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              アレルギー（該当するものを選択）
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {COMMON_ALLERGIES.map((allergy) => (
                <label key={allergy} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(userInfo.allergies || []).includes(allergy)}
                    onChange={() => toggleAllergy(allergy)}
                    className="mr-2"
                  />
                  <span className="text-sm">{allergy}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="text-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg disabled:cursor-not-allowed"
          >
            {isSubmitting ? '処理中... ⏳' : '食事プランを生成する 🚀'}
          </button>
          {isSubmitting && (
            <p className="text-sm text-gray-500 mt-2">
              データを処理中です。しばらくお待ちください...
            </p>
          )}
          
          {showFallbackMessage && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ ページ遷移に時間がかかっています。以下のボタンで直接移動してください：
              </p>
              <a
                href="/results"
                className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                結果ページに移動 →
              </a>
            </div>
          )}
          
          {/* デバッグ用：直接リンクでテスト */}
          <div className="mt-6 space-y-2">
            <div className="text-sm text-gray-600 mb-2">
              うまく遷移しない場合は以下のリンクをお試しください：
            </div>
            <a
              href="/results"
              className="inline-block bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              🔧 結果ページに直接移動
            </a>
          </div>
        </div>
      </form>
    </div>
  );
}