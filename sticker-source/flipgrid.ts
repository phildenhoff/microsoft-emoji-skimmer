import type {
  CategoryType,
  QueryCategoriesRes,
  QueryStickersRes,
  SelectableCategory,
  Sticker,
} from "./response.d.ts";

import type { CreateSource } from "./source.d.ts";

const baseUrl = "https://api.flipgrid.com/api/sticker_categories";

export const flipgrid: CreateSource = (logger) => {
  const downloadCategories = async (): Promise<SelectableCategory[]> => {
    return await fetch(baseUrl).then(async (result) => {
      const body: QueryCategoriesRes = await result.json();
      return body.data.map((category: CategoryType) => {
        logger.info(`Found category ${category.name}`);
        return {
          id: category.id,
          name: category.name,
          sticker_count: category.sticker_count,
        } as SelectableCategory;
      });
    });
  };

  const downloadCategoryStickers = async (
    selectedCategory: SelectableCategory
  ): Promise<PromiseSettledResult<string>[]> => {
    const collectedStickers: Sticker[] = [];
    let offset = 1;
    do {
      await fetch(baseUrl + `/${selectedCategory.id}/stickers?page=${offset}`)
        .then(async (result) => {
          const body: QueryStickersRes = await result.json();
          collectedStickers.push(...body.data);
        })
        .catch((err) => {
          logger.error(err);
        });
      offset += 1;
    } while (collectedStickers.length < selectedCategory.sticker_count);

    const svgs = collectedStickers.map((sticker) => ({
      url: sticker.assets.svg,
      name: sticker.name,
      pos: sticker.position,
    }));

    const folderName = `originals/${selectedCategory.name}`;
    Deno.mkdirSync(folderName, { recursive: true });

    return Promise.allSettled(
      svgs.map(async ({ url, pos, name }) => {
        const filepath = `${folderName}/${pos}-${name}.svg`;

        const result = await fetch(url);
        switch (result.status) {
          case 200: {
            const data = await result.arrayBuffer();
            Deno.writeFileSync(filepath, new Uint8Array(data));
            return Promise.resolve(url);
          }
          default:
            logger.error(
              `Request for ${url} failed: ${result.status} ${result.statusText}`
            );
            return Promise.reject(url);
        }
      })
    );
  };

  return {
    name: "Flipgrid",
    getCategories: downloadCategories,
    downloadStickersForCategory: downloadCategoryStickers,
  };
};
