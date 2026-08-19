import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api'),
  FRONTEND_URL: Joi.string().uri().required(),
  CORS_ALLOWED_ORIGINS: Joi.string().optional(),
  SWAGGER_ENABLED: Joi.boolean().default(false),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  TURNSTILE_ENABLED: Joi.boolean().default(false),
  TURNSTILE_SECRET_KEY: Joi.string().allow('').when('TURNSTILE_ENABLED', {
    is: true,
    then: Joi.string().required(),
  }),
  TURNSTILE_EXPECTED_HOSTNAME: Joi.string().allow('').default(''),
  TURNSTILE_EXPECTED_ACTION: Joi.string().default('contact'),
});
