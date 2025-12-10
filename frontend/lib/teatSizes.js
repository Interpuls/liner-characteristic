// Shared helpers for teat size display.
export const TEAT_SIZE_LABELS = {
  "40": "XS",
  "50": "S",
  "60": "M",
  "70": "L",
};

export const TEAT_SIZE_OPTIONS = Object.keys(TEAT_SIZE_LABELS);

export const formatTeatSize = (value) => TEAT_SIZE_LABELS[String(value)] || value;
