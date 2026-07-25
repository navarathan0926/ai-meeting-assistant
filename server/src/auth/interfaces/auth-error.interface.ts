import { AuthErrorCode } from '../enums/auth-error-code.enum';

export interface AuthErrorBody {
  message: string;
  code?: AuthErrorCode;
}
