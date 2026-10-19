import { ApiCastEmbeds } from 'farcaster-client-data';
import React from 'react';

import { getCastImageMediaForRendering } from '~/fork/klipyMediaRendering';

import { ImageAttachmentGroup } from './ImageAttachmentGroup';

type ImageAttachmentsProps = {
  images: ApiCastEmbeds['images'];
  height?: number;
  width?: number;
  maxWidth?: number;
  ignoreAspectRatio: boolean;
  carouselIndex?: number;
  noShrink?: boolean;
  snapContext?: boolean;
};

const ImageAttachments: React.FC<ImageAttachmentsProps> = ({
  images,
  height,
  width,
  maxWidth,
  ignoreAspectRatio,
  carouselIndex,
  noShrink,
  snapContext = false,
}) => {
  const ImageAttachmentsComponent = React.useMemo(() => {
    if (images.length === 0) {
      return <></>;
    }

    const mediaImageEmbeds = images.map(getCastImageMediaForRendering);

    return (
      <ImageAttachmentGroup
        medias={mediaImageEmbeds}
        height={height}
        width={width}
        maxWidth={maxWidth}
        ignoreAspectRatio={ignoreAspectRatio}
        carouselIndex={carouselIndex}
        noShrink={noShrink}
        snapContext={snapContext}
      />
    );
  }, [
    carouselIndex,
    height,
    ignoreAspectRatio,
    images,
    maxWidth,
    noShrink,
    snapContext,
    width,
  ]);

  return <>{ImageAttachmentsComponent}</>;
};

ImageAttachments.displayName = 'ImageAttachments';

export { ImageAttachments };
