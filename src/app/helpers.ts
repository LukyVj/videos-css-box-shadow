export const isBrowser = () => typeof window !== "undefined";

export const RGBToHex = (val: string) => {
  const rgb = val.match(/\d+/g);
  if (!rgb) {
    return "";
  }
  return `#${parseInt(rgb[0], 10).toString(16)}${parseInt(rgb[1], 10).toString(
    16
  )}${parseInt(rgb[2], 10).toString(16)}`;
};
