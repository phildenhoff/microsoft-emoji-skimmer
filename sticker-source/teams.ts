import {
  Option,
  Some,
  None,
  Ok,
  Err,
  Result,
} from "https://deno.land/x/monads/mod.ts";
import { Category, Emoticon } from "./response-teams.d.ts";

import type { SelectableCategory } from "./response.d.ts";

import { CreateSource } from "./source.d.ts";

const BASE_URL =
  "https://statics.teams.cdn.office.net/evergreen-assets/personal-expressions/v2/assets/emoticons";
const TEAMS_SETTINGS_URL = "https://teams.live.com/scripts/settings.js";

const getLatestEmoticonHash = async (): Promise<Option<string>> => {
  const res = await fetch(TEAMS_SETTINGS_URL);
  const text = await res.text();
  const matches = text.match(/"emoticonResourceVersion":"([a-z1-9]*)"/);

  if (!matches || matches.length == 0) return None;
  return Some(matches[1]);
};

const downloadLatestStickerList = async (hash: string) => {
  const res = await fetch(
    `https://statics.teams.cdn.live.net/evergreen-assets/personal-expressions/v1/metadata/${hash}/default.json`
  );
  const json: Category[] = (await res.json()).categories;
  return json;
};

const urlForSticker = (sticker: Emoticon): string =>
  `${BASE_URL}/${sticker.id}/default/100_anim_f.png?${sticker.etag}`;

export const teams: CreateSource = (logger) => {
  // Set within `downloadCategories`
  let mutableStickerList: Category[] = [];

  /**
   * Down the list of sticker categores from Teams
   */
  const downloadCategories = async (): Promise<SelectableCategory[]> => {
    const maybeLatestHash = await getLatestEmoticonHash();
    if (maybeLatestHash.isNone()) {
      logger.error(
        "Failed to get the latest list of categories. There's nothing we can do."
      );
      logger.error("If this keeps happening, please open an issue on GitHub!");
      return Promise.reject([]);
    }

    const stickerList = await downloadLatestStickerList(
      maybeLatestHash.unwrap()
    );
    const categories = stickerList.map(({ id, title, description }) => ({
      id,
      title,
      description,
    }));

    mutableStickerList = stickerList;

    return categories;
  };

  const downloadCategoryStickers = async (
    category: SelectableCategory
  ): Promise<PromiseSettledResult<Result<string, Response>>[]> => {
    const categoryStickers =
      mutableStickerList.find((item) => item.id === category.id)?.emoticons ||
      [];

    const folderName = `originals/teams/${category.title}`;
    Deno.mkdirSync(folderName, { recursive: true });

    return Promise.allSettled(
      categoryStickers.map(async (sticker) => {
        const filePath = `${folderName}/${sticker.id}.png`;
        const url = urlForSticker(sticker);
        const result = await fetch(url);

        switch (result.status) {
          case 200: {
            const data = await result.arrayBuffer();
            Deno.writeFileSync(filePath, new Uint8Array(data));
            return Ok(sticker.id);
          }
          default:
            logger.error(
              `Request for ${url} failed: ${result.status} ${result.statusText}`
            );
            return Err(result);
        }
      })
    );
  };

  return {
    name: "Teams",
    getCategories: downloadCategories,
    downloadCategoryStickers,
  };
};
