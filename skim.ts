import { pooledMap } from "https://deno.land/std@0.78.0/async/mod.ts";

import { Checkbox } from "https://deno.land/x/cliffy@v0.20.1/prompt/checkbox.ts";
import { Select } from "https://deno.land/x/cliffy@v0.20.1/prompt/select.ts";

import { Confirm } from "https://deno.land/x/cliffy@v0.20.1/prompt/confirm.ts";
import Spinner from "https://deno.land/x/cli_spinners@v0.0.2/mod.ts";

import { getLogger } from "./util.ts";
import { flipgrid } from "./sticker-source/flipgrid.ts";
import { SelectableCategory } from "./sticker-source/response.d.ts";
import { isTeams, teams } from "./sticker-source/teams.ts";
import { StickerSource } from "./sticker-source/source.d.ts";
import { ResErr } from "https://deno.land/x/monads@v0.5.10/result/result.ts";

const MAX_CONCURRENT_DOWNLOADS = 15;

const logger = getLogger();

const main = async () => {
  const spinner = Spinner.getInstance();
  const sources = [flipgrid(logger), teams(logger)];

  const sourceSelection: string = await Select.prompt({
    message:
      "Choose your emoji source. Flipgrid has high-resolution stickers, but Teams has animated, lower-res stickers.",
    options: sources.map((item) => ({ name: item.name, value: item.name })),
  });

  const source = sources.find(
    (item) => item.name === sourceSelection
  ) as StickerSource;

  const shouldTransform = isTeams(source)
    ? await Confirm.prompt({
        message:
          "Do you want to transform animation sprites into animations & usable stickers?",
      })
    : false;

  const categories = await source.getCategories();
  const categoryById = new Map<string, SelectableCategory>(
    categories.map((category) => [category.id, category])
  );

  const defaultCategories = ["Emojis", "People", "Smilies"];

  const selectedCategoriesIds = await Checkbox.prompt({
    message:
      "Choose categories to download (space to select, enter to continue)",
    options: categories.map((c: SelectableCategory) => ({
      name: c.title,
      value: c.id.toString(),
      checked: defaultCategories.includes(c.title),
    })),
  });
  const selectedCategories = selectedCategoriesIds.map(
    (id) => categoryById.get(id) as SelectableCategory
  );

  const downloadRoot = `originals/`;
  Deno.mkdirSync(downloadRoot, { recursive: true });

  const stickerDownloaders = source.genStickerlistForCategories(
    selectedCategories,
    downloadRoot
  );

  spinner.start("Downloading stickers");
  const asyncAllStickerDownloads = pooledMap(
    MAX_CONCURRENT_DOWNLOADS,
    stickerDownloaders,
    async (downloader) => downloader()
  );

  // Wait for all sticker downloads to finish
  const completedDownloads = [];
  for await (const value of asyncAllStickerDownloads) {
    completedDownloads.push(value);
  }

  const failedDownloads = completedDownloads.filter(result => result.isErr()) as ResErr<string, Response>[];

  if (failedDownloads.length === 0) {
    await spinner.succeed("All stickers downloaded successfully");
  } else {
    await spinner.fail("Some stickers failed to download");

    const shouldDisplayFailed = await Confirm.prompt(
      "Do you want to view the list of failed downloads?"
    );
    if (shouldDisplayFailed) {
      logger.error("Failed downloads: ");
      failedDownloads.forEach((downloadResult) => {
        logger.error(downloadResult.err().unwrap().url);
      });
    }
  }

  if (!shouldTransform) Deno.exit(0);
}
main();
