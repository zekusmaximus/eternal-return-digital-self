/**
 * Hook for accessing the new architecture services
 * Provides clean access to application services and use cases
 */

import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { ContentApplicationService } from '../application/services/ContentApplicationService';
import { NavigateToNodeUseCase } from '../application/usecases/NavigateToNodeUseCase';
import { GetContentUseCase } from '../application/usecases/GetContentUseCase';
import { SimplifiedAppDispatch, simplifiedStore } from '../infrastructure/state/store';

export const useNewArchitecture = () => {
  const dispatch = useDispatch() as SimplifiedAppDispatch;

  // Create services and use cases with memoization
  const services = useMemo(() => {
    const contentService = new ContentApplicationService(
      dispatch,
      () => simplifiedStore.getState()
    );

    const navigateUseCase = new NavigateToNodeUseCase(contentService);
    const getContentUseCase = new GetContentUseCase(contentService);

    return {
      contentService,
      navigateUseCase,
      getContentUseCase,
    };
  }, [dispatch]);

  return services;
};