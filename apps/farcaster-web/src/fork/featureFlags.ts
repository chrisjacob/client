/**
 * Build-time feature flags owned by the 10X fork.
 *
 * Keep fork-only product switches here so upstream refreshes have a single,
 * obvious customization boundary. VITE_ values are public browser config.
 */
const parseBooleanFeatureFlag = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  switch (value?.trim().toLowerCase()) {
    case '1':
    case 'true':
      return true;
    case '0':
    case 'false':
      return false;
    default:
      return defaultValue;
  }
};

type ForkFeatureFlagEnvironment = {
  VITE_10X_FEATURES?: string;
  VITE_10X_FEATURE_ANIMATED_AVATARS?: string;
};

const resolveForkFeatureFlags = (environment: ForkFeatureFlagEnvironment) => {
  const enabled = parseBooleanFeatureFlag(environment.VITE_10X_FEATURES, true);

  return Object.freeze({
    enabled,
    animatedAvatars:
      enabled &&
      parseBooleanFeatureFlag(
        environment.VITE_10X_FEATURE_ANIMATED_AVATARS,
        true,
      ),
  });
};

const forkFeatureFlags = resolveForkFeatureFlags(import.meta.env);

export { forkFeatureFlags, parseBooleanFeatureFlag, resolveForkFeatureFlags };
