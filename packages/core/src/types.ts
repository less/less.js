export enum TextFormat {
  RESET,
  BOLD,
  INVERSE,
  UNDERLINE,
  YELLOW,
  GREEN,
  RED,
  GREY
}

export type TextStyleFunction = {
  (str: string, color?: TextFormat)
}