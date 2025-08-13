import { SetMetadata } from '@nestjs/common';

// Definimos uma chave única para nossos metadados
export const IS_PUBLIC_KEY = 'isPublic';

// O decorador `@Public()` é simplesmente um atalho para `SetMetadata(IS_PUBLIC_KEY, true)`
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
