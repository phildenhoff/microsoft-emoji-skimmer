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

const baseUrl = "https://api.flipgrid.com/api/sticker_categories";


type SelectableCategory = Pick<CategoryType, "id" | "name" | "sticker_count">;

type InvalidSelectionError = {
  message: string;
};

const logger = (msg: string) => console.log(msg);

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

const promptChooseCategory = async (
  selectableCategories: SelectableCategory[]
): TResultAsync<SelectableCategory, InvalidSelectionError> => {
  const input = new InputLoop();
  const chosenValues: boolean[] = await input.choose(
    selectableCategories.map((c) => `${c.name} ${c.id}`)
  );
  const selectedIndex = chosenValues.indexOf(true);
  if (selectedIndex <= -1) {
    return fail({
      message: "You must select an item in the list.",
    } as InvalidSelectionError);
  }

  return ok(selectableCategories[selectedIndex]);
};

const downloadCategoryStickers = async (
  selectedCategory: SelectableCategory
): Promise<void> => {
  const collectedStickers: Sticker[] = [];
  let offset = 1;
  do {
    logger(`Downloading page ${offset}`);
    await fetch(
      baseUrl + `/${selectedCategory.id}/stickers?page=${offset}`
    ).then(async (result) => {
      const body: QueryStickersRes = await result.json();
      collectedStickers.push(...body.data);
    }).catch(err => {
      console.log(err);
    });
    offset += 1;
  } while (collectedStickers.length < selectedCategory.sticker_count);

  logger('Downloading SVGs');
  const svgs = collectedStickers.map((sticker) => ({ url: sticker.assets.svg, pos: sticker.position }));
  svgs.forEach(({url: svg, pos}) => {
    const filename = svg.split("/").pop() || svg;
    const folder = `originals/${selectedCategory.name}`;
    Deno.mkdirSync(folder, {recursive: true, });
    const filepath = `${folder}/${pos}-${filename}`;
    fetch(svg).then((result) => {
      result.blob().then((blob) => {
        blob.text().then((content) => Deno.writeTextFile(filepath, content));
      });
    }).catch(err => {
      console.log('Error downloading SVG', err);
    });
  });
};

const main = async () => {
  const categories = await downloadCategories(baseUrl);
  const categoryById = new Map<number, SelectableCategory>(
    categories.map((category) => [category.id, category])
  );

  const selectedCategoriesIds: string[] = await Checkbox.prompt({
    message: "Choose categories to download (space to select, enter to continue)",
    options: categories.map((c: SelectableCategory) => ({
      name: c.name,
      value: c.id.toString()
    })),
  });
  const selectedCategories = selectedCategoriesIds.map((id) => categoryById.get(parseInt(id)) as SelectableCategory);

  await Promise.all(selectedCategories.map((category) => {
    downloadCategoryStickers(category);
  }));
  console.log("Downloads complete");
};

main();