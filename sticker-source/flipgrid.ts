import { Err, Ok, Result } from "https://deno.land/x/monads/mod.ts";

import { SelectableCategory } from "./response.d.ts";
import type {
  CategoryType,
  QueryCategoriesRes,
  QueryStickersRes,
  Sticker,
} from "./response-flipgrid.d.ts";

import type { CreateSource, StickerDownloader, StickerSource } from "./source.d.ts";

const BASE_URL = "https://api.flipgrid.com/api/sticker_categories";

export const flipgrid: CreateSource = (logger) => {
  const categories = new Map<string, CategoryType>();

  /**
   * Download the list of sticker categories from Flipgrid
   */
  const downloadCategories = async (): Promise<SelectableCategory[]> => {
    return await fetch(BASE_URL).then(async (result) => {
      const body: QueryCategoriesRes = await result.json();
      return body.data.map((category: CategoryType) => {
        logger.info(`Found category ${category.name}`);
        categories.set(category.id.toString(), category);

        return {
          id: category.id.toString(),
          title: category.name,
          sticker_count: category.sticker_count,
        } as SelectableCategory;
      });
    });
  };

  /**
   * Download all of the stickers within a category.
   */
  const genStickerlistForCategories = (
    categories: SelectableCategory[],
    downloadLoc: string
  ): StickerDownloader[] => {
    const collectedStickers: Sticker[] = [];
    const stickerCount =
      categories.get(selectedCategory.id.toString())?.sticker_count || 0;

    let offset = 1;
    do {
      await fetch(BASE_URL + `/${selectedCategory.id}/stickers?page=${offset}`)
        .then(async (result) => {
          const body: QueryStickersRes = await result.json();
          collectedStickers.push(...body.data);
        })
        .catch((err) => {
          logger.error(err);
        });
      offset += 1;
    } while (collectedStickers.length < stickerCount);

    const svgs = collectedStickers.map((sticker) => ({
      id: sticker.id,
      url: sticker.assets.svg,
      name: sticker.name,
      pos: sticker.position,
    }));

    const folderName = `originals/${selectedCategory.title}`;
    Deno.mkdirSync(folderName, { recursive: true });

    return Promise.allSettled(
      svgs.map(async ({ url, pos, name, id }) => {
        const filePath = `${folderName}/${pos}-${name}.svg`;

        const result = await fetch(url);
        switch (result.status) {
          case 200: {
            const data = await result.arrayBuffer();
            Deno.writeFileSync(filePath, new Uint8Array(data));
            return Ok(filePath);
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
    name: "Flipgrid",
    getCategories: downloadCategories,
    genStickerlistForCategories,
  };
};
