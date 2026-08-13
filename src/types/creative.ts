export interface ResponsiveMedia {
  desktop: string;
  mobile: string;
}

export interface CreativeItem {
  id: string;
  slug: string;
  src: string;
  poster?: string;
  type: "image" | "video";
  paragraph: string | null;
  caseStudy: boolean;
  firstBlockMedia?: ResponsiveMedia;
  href?: string;
  /** Legacy DOM-scene fields retained only until the canvas rebuild is assembled. */
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  drift: number;
}
