// LocalStorage工具函数，用于保存和恢复表单数据

interface FormData {
  englishName: string;
  gender: 'male' | 'female' | 'other';
  birthYear?: string;
  personalityTraits?: string;
  namePreferences?: string;
  savedAt: number;
  expiresIn: number;
}

const STORAGE_KEY = 'chinese_name_form_data';
const EXPIRY_DAYS = 3;
const EXPIRY_TIME = EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 3天的毫秒数

/**
 * 保存表单数据到 LocalStorage
 */
export function saveFormData(formData: Omit<FormData, 'savedAt' | 'expiresIn'>) {
  try {
    const dataToSave: FormData = {
      ...formData,
      savedAt: Date.now(),
      expiresIn: EXPIRY_TIME
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    console.log('Form data saved to localStorage:', { 
      englishName: formData.englishName,
      savedAt: new Date(dataToSave.savedAt).toLocaleString()
    });
  } catch (error) {
    console.error('Failed to save form data to localStorage:', error);
  }
}

/**
 * 从 LocalStorage 读取表单数据
 * 如果数据过期，会自动清除
 */
export function loadFormData(): Omit<FormData, 'savedAt' | 'expiresIn'> | null {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) {
      return null;
    }

    const parsedData: FormData = JSON.parse(savedData);
    
    // 检查数据是否过期
    const isExpired = Date.now() - parsedData.savedAt > parsedData.expiresIn;
    
    if (isExpired) {
      console.log('Form data has expired, clearing localStorage');
      clearFormData();
      return null;
    }

    console.log('Form data loaded from localStorage:', {
      englishName: parsedData.englishName,
      savedAt: new Date(parsedData.savedAt).toLocaleString(),
      expiresAt: new Date(parsedData.savedAt + parsedData.expiresIn).toLocaleString()
    });

    // 返回表单数据（不包含时间戳）
    const { savedAt, expiresIn, ...formData } = parsedData;
    return formData;
  } catch (error) {
    console.error('Failed to load form data from localStorage:', error);
    clearFormData(); // 如果解析失败，清除损坏的数据
    return null;
  }
}

/**
 * 清除保存的表单数据
 */
export function clearFormData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Form data cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear form data from localStorage:', error);
  }
}

/**
 * 检查是否有保存的表单数据（且未过期）
 */
export function hasValidFormData(): boolean {
  const data = loadFormData();
  return data !== null;
}

/**
 * 获取数据的剩余有效时间（分钟）
 */
export function getDataExpiryInfo(): { hasData: boolean; expiresInMinutes?: number } {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) {
      return { hasData: false };
    }

    const parsedData: FormData = JSON.parse(savedData);
    const remainingTime = (parsedData.savedAt + parsedData.expiresIn) - Date.now();
    
    if (remainingTime <= 0) {
      return { hasData: false };
    }

    return {
      hasData: true,
      expiresInMinutes: Math.floor(remainingTime / (1000 * 60))
    };
  } catch (error) {
    console.error('Failed to get expiry info:', error);
    return { hasData: false };
  }
}