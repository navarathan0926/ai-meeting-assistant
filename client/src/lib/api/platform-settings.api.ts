import apiClient from '../axios';
import { ApiResponse } from '@/types/api';
import { PlatformSettings } from '@/types/platform-settings';

export const platformSettingsApi = {
  get: async (): Promise<PlatformSettings> => {
    const response = await apiClient.get<ApiResponse<PlatformSettings>>(
      '/platform-settings',
    );
    return response.data.data;
  },

  update: async (allowPublicSignup: boolean): Promise<PlatformSettings> => {
    const response = await apiClient.patch<ApiResponse<PlatformSettings>>(
      '/platform-settings',
      { allowPublicSignup },
    );
    return response.data.data;
  },
};
