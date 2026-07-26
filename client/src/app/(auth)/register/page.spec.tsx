import React from 'react';
import { render, screen } from '@testing-library/react';
import RegisterPage from './page';
import { useAuthConfig } from '@/hooks/useAuthConfig';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRegister } from '@/hooks/useAuth';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAuthConfig', () => ({
  useAuthConfig: jest.fn(),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useRegister: jest.fn(),
}));

const mockedUseAuthConfig = useAuthConfig as jest.MockedFunction<typeof useAuthConfig>;
const mockedUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;
const mockedUseRegister = useRegister as jest.MockedFunction<typeof useRegister>;

function mockAuthContext(
  overrides: Partial<ReturnType<typeof useAuthContext>> = {},
) {
  mockedUseAuthContext.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  });
}

function mockRegisterMutation(
  overrides: Partial<ReturnType<typeof useRegister>> = {},
) {
  mockedUseRegister.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
    error: null,
    ...overrides,
  } as ReturnType<typeof useRegister>);
}

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext();
    mockRegisterMutation();
  });

  it('should render the registration form when public signup is enabled', () => {
    mockedUseAuthConfig.mockReturnValue({
      data: { allowPublicSignup: true },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useAuthConfig>);

    render(<RegisterPage />);

    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should show a loading state while auth config is loading', () => {
    mockedUseAuthConfig.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useAuthConfig>);

    render(<RegisterPage />);

    expect(screen.queryByRole('heading', { name: 'Create account' })).not.toBeInTheDocument();
    expect(screen.getByText('', { selector: '.btn-spinner' })).toBeInTheDocument();
  });

  it('should redirect to login when public signup is disabled', () => {
    mockedUseAuthConfig.mockReturnValue({
      data: { allowPublicSignup: false },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useAuthConfig>);

    render(<RegisterPage />);

    expect(mockReplace).toHaveBeenCalledWith('/login?message=registration_disabled');
    expect(screen.queryByRole('heading', { name: 'Create account' })).not.toBeInTheDocument();
  });

  it('should redirect to login when auth config fails to load', () => {
    mockedUseAuthConfig.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useAuthConfig>);

    render(<RegisterPage />);

    expect(mockReplace).toHaveBeenCalledWith('/login?message=registration_disabled');
  });
});
