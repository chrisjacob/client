import { forkFeatureFlags } from '~/fork/featureFlags';
import { applyCloudflarePath } from '~/utils/images';

type ForkAvatarImageOptions = {
  animatedAvatars?: boolean;
};

/**
 * Re-enables animation in both direct and URL-encoded wrpcd transforms.
 * Profile-image URLs can arrive pre-transformed, then be wrapped by the web
 * client's image proxy a second time, so the policy is applied before and
 * after the upstream transformer.
 */
const enableCdnAnimation = (url: string): string =>
  url
    .replace(/anim=false/gi, 'anim=true')
    .replace(/anim%3Dfalse/gi, 'anim%3Dtrue');

const applyForkAvatarImagePath = (
  url: string,
  width: number,
  options: ForkAvatarImageOptions = {},
): string => {
  const animatedAvatars =
    options.animatedAvatars ?? forkFeatureFlags.animatedAvatars;
  const sourceUrl = animatedAvatars ? enableCdnAnimation(url) : url;
  const transformedUrl = applyCloudflarePath(sourceUrl, width);

  return animatedAvatars ? enableCdnAnimation(transformedUrl) : transformedUrl;
};

export { applyForkAvatarImagePath, enableCdnAnimation };
