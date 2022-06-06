import { Checkbox } from "https://deno.land/x/cliffy@v0.20.1/prompt/checkbox.ts";
import { Confirm } from "https://deno.land/x/cliffy@v0.20.1/prompt/confirm.ts";
import Spinner from "https://deno.land/x/cli_spinners@v0.0.2/mod.ts";

import { getLogger } from "./util.ts";
import { flipgrid } from "./sticker-source/flipgrid.ts";
import { SelectableCategory } from "./response.d.ts";

const logger = getLogger();

const main = async () => {
  const spinner = Spinner.getInstance();
  const sources = [flipgrid(logger)];

  // todo: make interactive
  const source = sources[0];

  const categories = await source.getCategories();
  const categoryById = new Map<number, SelectableCategory>(
    categories.map((category) => [category.id, category])
  );

  const defaultCategories = ["Emojis", "People", "Smilies"];

  const selectedCategoriesIds = await Checkbox.prompt({
    message:
      "Choose categories to download (space to select, enter to continue)",
    options: categories.map((c: SelectableCategory) => ({
      name: c.name,
      value: c.id.toString(),
      checked: defaultCategories.includes(c.name),
    })),
  });
  const selectedCategories = selectedCategoriesIds.map(
    (id) => categoryById.get(parseInt(id)) as SelectableCategory
  );

  spinner.start("Downloading stickers");
  const allStickerDownloads = selectedCategories.map(
    source.downloadStickersForCategory
  );

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

    const shouldDisplayFailed = await Confirm.prompt(
      "Do you want to view the list of failed downloads?"
    );
    if (shouldDisplayFailed) {
      logger.error("Failed downloads: ");
      failedDownloads.forEach((downloadResult) => {
        logger.error(downloadResult);
      });
    }
  }
};

main();
