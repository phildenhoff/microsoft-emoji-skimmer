export type Category = {
  id: string;
  title: string;
  description: string;
  emoticons: Emoticon[];
};

export type EmoticonAnimation = {
  // Generally 24
  fps: number;
  framesCount: number;
  firstFrame: number;
};

export type Emoticon = {
  id: string;
  description: string;
  shortcuts: string[];
  unicode: string;
  // v1, v5...v22 etc. Must be used as a query param.
  etag: string;
  diverse: boolean;
  animation: EmoticonAnimation;
  keywords: string[];
};
