import { Result } from "https://deno.land/x/monads/mod.ts";

import { SelectableCategory } from "./response.d.ts";
import { ILogger } from "../util.ts";

export type CreateSource = (logger: ILogger) => StickerSource;
export type StickerDownloader = () => Promise<Result<string, Response>>;

export type StickerSource = {
  name: string;
  getCategories: () => Promise<SelectableCategory[]>;
  genStickerlistForCategories: (
    category: SelectableCategory[],
    downloadLoc: string
  ) => StickerDownloader[];
};
