export type Image = {
  svg: string;
  pdf: string;
  png: string;
};

export type Sticker = {
  id: number;
  category: string;
  name: string;
  position: number;
  updated_at: Date;
  width: string;
  height: string;
  assets: Image;
};

export type CategoryType = {
  id: number;
  name: string;
  position: number;
  per_row: number;
  sticker_count: number;
  updated_at: Date;
  icons: Image;
  stickers: Sticker[];
  // [k: string]: string | number
};

export type QueryCategoriesRes = {
  data: CategoryType[];
};

// export type StickerType = {
//   id: number;
//   category: string;
//   assets: Image;
//   name: string;
//   positon: number;
//   updated_at: Date;
//   width: string;
//   height: string;
// };

export type QueryStickersRes = {
  metadata: {
    pagination: {
      total: number;
      total_pages: number;
      first_page: boolean;
      last_page: boolean;
      current_page: boolean;
      limit: number;
      offset: number;
    };
  };
  data: Sticker[];
};
