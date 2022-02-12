import InputLoop from "https://deno.land/x/input@2.0.2/index.ts";
import {
  fail,
  ok,
  TResultAsync,
} from "https://deno.land/x/result@5.0.0/mod.ts";

import {
  CategoryType,
  QueryCategoriesRes,
  Sticker,
  QueryStickersRes,
} from "./response.d.ts";

import { Checkbox } from "https://deno.land/x/cliffy@v0.20.1/prompt/checkbox.ts";
import { Confirm } from "https://deno.land/x/cliffy@v0.20.1/prompt/confirm.ts";

import Spinner from "https://deno.land/x/cli_spinners@v0.0.2/mod.ts";

const baseUrl = "https://api.flipgrid.com/api/sticker_categories";

type SelectableCategory = Pick<CategoryType, "id" | "name" | "sticker_count">;

type InvalidSelectionError = {
  message: string;
};

type LogMessage = (msg: string) => void;
interface ILogger {
  info: LogMessage;
  debug: LogMessage;
  warn: LogMessage;
  error: LogMessage;
}

const prodLogger = () => {
  return {
    info: () => {},
    debug: () => {},
    warn: console.warn,
    error: console.error,
  };
};

const devLogger = () => {
  return {
    info: console.log,
    debug: console.debug,
    warn: console.warn,
    error: console.error,
  };
};

export const getLogger = (): ILogger => {
  if (Deno.env.get("NODE_ENV") === "production") {
    return prodLogger();
  }
  return devLogger();
};

const logger = getLogger();

const downloadCategories = async (
  baseUrl: string
): Promise<SelectableCategory[]> => {
  return await fetch(baseUrl).then(async (result) => {
    const body: QueryCategoriesRes = await result.json();
    return body.data.map((category: CategoryType) => {
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
        console.log(err);
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
          console.error(
            `Request for ${url} failed: ${result.status} ${result.statusText}`
          );
          return Promise.reject(url);
      }
    })
  );
};

const main = async () => {
  const spinner = Spinner.getInstance();
  const categories = await downloadCategories(baseUrl);
  const categoryById = new Map<number, SelectableCategory>(
    categories.map((category) => [category.id, category])
  );

  const selectedCategoriesIds = await Checkbox.prompt({
    message:
      "Choose categories to download (space to select, enter to continue)",
    options: categories.map((c: SelectableCategory) => ({
      name: c.name,
      value: c.id.toString(),
    })),
  });
  const selectedCategories = selectedCategoriesIds.map(
    (id) => categoryById.get(parseInt(id)) as SelectableCategory
  );

  spinner.start("Downloading stickers");
  const allStickerDownloads = selectedCategories.map(downloadCategoryStickers);

  // Wait for all sticker downloads to finish
  const allCategoriesComplete = await Promise.allSettled(allStickerDownloads);

  const failedDownloads: string[] = [];
  allCategoriesComplete.forEach((combinedDownloadsPromise) => {
    if (combinedDownloadsPromise.status === "rejected") {
      logger.error("An error occured while all-settling the promise");
      return false;
    }

    failedDownloads.push(
      ...combinedDownloadsPromise.value
        .filter((result) => result.status === "rejected")
        .map((result) => (result as PromiseRejectedResult).reason)
    );
  });

  if (failedDownloads.length === 0) {
    await spinner.succeed("All stickers downloaded successfully");
  } else {
    await spinner.fail("Some stickers failed to download");

    const confirmed = await Confirm.prompt(
      "Do you want to view the list of failed downloads?"
    );
    if (confirmed) {
      logger.error("Failed downloads: ");
      failedDownloads.forEach((downloadResult) => {
        console.error(downloadResult);
      });
    }
  }
};

main();
