import { Result } from "https://deno.land/x/monads/mod.ts";

import { SelectableCategory } from "./response.d.ts";
import { ILogger } from "../util.ts";

export type CreateSource = (logger: ILogger) => StickerSource;

export type StickerSource = {
  name: string;
  getCategories: () => Promise<SelectableCategory[]>;
  downloadCategoryStickers: (
    category: SelectableCategory
  ) => Promise<PromiseSettledResult<Result<string, Response>>[]>;
};
