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
  VITE_10X_FEATURE_KLIPY_MEDIA_PICKER?: string;
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
    klipyMediaPicker:
      enabled &&
      parseBooleanFeatureFlag(
        environment.VITE_10X_FEATURE_KLIPY_MEDIA_PICKER,
        true,
      ),
  });
};

const forkFeatureFlags = resolveForkFeatureFlags({
  VITE_10X_FEATURES: import.meta.env.VITE_10X_FEATURES,
  VITE_10X_FEATURE_ANIMATED_AVATARS: import.meta.env
    .VITE_10X_FEATURE_ANIMATED_AVATARS,
  VITE_10X_FEATURE_KLIPY_MEDIA_PICKER: import.meta.env
    .VITE_10X_FEATURE_KLIPY_MEDIA_PICKER,
});

export { forkFeatureFlags, parseBooleanFeatureFlag, resolveForkFeatureFlags };
