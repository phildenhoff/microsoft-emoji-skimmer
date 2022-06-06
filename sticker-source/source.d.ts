import { SelectableCategory } from "./response.d.ts";
import { ILogger } from "../util.ts";

export type CreateSource = (logger: ILogger) => StickerSource;

export type StickerSource = {
  name: string;
  getCategories: () => Promise<SelectableCategory[]>;
  downloadStickersForCategory: (
    category: SelectableCategory
  ) => Promise<PromiseSettledResult<string>[]>;
};
