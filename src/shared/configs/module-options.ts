import { ConfigModuleOptions } from '@nestjs/config/dist/interfaces';
import * as Joi from 'joi';

import configuration from './configuration';

export const configModuleOptions: ConfigModuleOptions = {
  envFilePath: '.env',
  load: [configuration],
  validationSchema: Joi.object({
    APP_ENV: Joi.string()
      // `staging` is a first-class value so a tester-facing deployment can be
      // seeded with one command and no flags (see seeding-gate.ts). Swagger
      // stays off for it: main.ts only mounts the schema for development/test.
      .valid('development', 'production', 'staging', 'test')
      .default('development'),
    APP_PORT: Joi.number().required(),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().optional(),
    DB_NAME: Joi.string().required(),
    DB_USER: Joi.string().required(),
    DB_PASS: Joi.string().required(),
    JWT_PUBLIC_KEY_BASE64: Joi.string().required(),
    JWT_PRIVATE_KEY_BASE64: Joi.string().required(),
    JWT_ACCESS_TOKEN_EXP_IN_SEC: Joi.number().required(),
    JWT_REFRESH_TOKEN_EXP_IN_SEC: Joi.number().required(),
    DEFAULT_ADMIN_USER_PASSWORD: Joi.string().required(),
    APP_TRUST_PROXY_HEADERS: Joi.string().valid('0', '1').optional(),
    MAIL_TRANSPORT: Joi.string().valid('log', 'resend').default('log'),
    // Required only for the resend transport: a missing key fails at boot
    // rather than at the first password reset.
    RESEND_API_KEY: Joi.string().when('MAIL_TRANSPORT', {
      is: 'resend',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    MAIL_FROM: Joi.string().when('MAIL_TRANSPORT', {
      is: 'resend',
      then: Joi.string().required(),
      otherwise: Joi.optional(),
    }),
    // Only needed when mail is on; `log` prints a link that also needs an origin.
    APP_PUBLIC_URL: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .when('MAIL_TRANSPORT', {
        is: 'resend',
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    APP_THROTTLE_ENABLED: Joi.string().valid('0', '1').optional(),
  }),
};
