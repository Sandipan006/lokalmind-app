/** Dev-only logger. Silent in production builds; use console.warn/error for things users must see. */
export const logger = {
  debug: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    if (__DEV__) console.log(...args);
  },
};
