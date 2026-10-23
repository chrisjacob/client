// Prefetch can finish before the menu mounts, so image failures must not reject.
export function prefetchShareIcon(
  src: string,
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
