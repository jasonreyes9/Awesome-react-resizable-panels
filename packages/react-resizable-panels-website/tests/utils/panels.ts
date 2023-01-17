import { Locator, expect, Page } from "@playwright/test";
import { verifyFuzzySizes } from "./verify";

export async function dragResizeTo(
  page: Page,
  panelId: string,
  ...tuples: [nextSize: number, expectexSizes: number[]][]
) {
  const panels = page.locator("[data-panel-id]");

  const panelCount = await panels.count();
  let panel = null;
  let panelIndex = 0;
  for (panelIndex = 0; panelIndex < panelCount; panelIndex++) {
    panel = panels.nth(panelIndex);

    const id = await panel.getAttribute("data-panel-id");
    if (id === panelId) {
      break;
    }
  }

  const dragHandles = page.locator("[data-panel-resize-handle-id]");
  const dragHandlesCount = await dragHandles.count();
  const dragHandle = dragHandles.nth(
    Math.min(dragHandlesCount - 1, panelIndex)
  );
  const dragHandleRect = await dragHandle.boundingBox();

  const panelGroupId = await dragHandle.getAttribute("data-panel-group-id");
  const panelGroup = page.locator(
    `[data-panel-group][data-panel-group-id="${panelGroupId}"]`
  );
  const direction = await panelGroup.getAttribute("data-panel-group-direction");
  const panelGroupRect = await panelGroup.boundingBox();

  let pageX = dragHandleRect.x + dragHandleRect.width / 2;
  let pageY = dragHandleRect.y + dragHandleRect.height / 2;

  const moveIncrement = 1;

  const pageXMin = panelGroupRect.x;
  const pageXMax = panelGroupRect.x + panelGroupRect.width;
  const pageYMin = panelGroupRect.y;
  const pageYMax = panelGroupRect.y + panelGroupRect.height;

  await page.mouse.move(pageX, pageY);
  await page.mouse.down();

  for (let i = 0; i < tuples.length; i++) {
    const [nextSize, expectedSizes] = tuples[i];

    const prevSize = await panel.getAttribute("data-panel-size");
    const isExpanding = parseFloat(prevSize) < nextSize;

    // Last panel should drag the handle before it back (left/up)
    // All other panels should drag the handle after it forward (right/down)
    let dragIncrement = 0;
    if (isExpanding) {
      dragIncrement =
        panelIndex === panelCount - 1 ? -moveIncrement : moveIncrement;
    } else {
      dragIncrement =
        panelIndex === panelCount - 1 ? moveIncrement : -moveIncrement;
    }

    const deltaX = direction === "horizontal" ? dragIncrement : 0;
    const deltaY = direction === "vertical" ? dragIncrement : 0;

    while (
      pageX > pageXMin &&
      pageX < pageXMax &&
      pageY > pageYMin &&
      pageY < pageYMax
    ) {
      pageX = Math.min(pageXMax, Math.max(pageXMin, pageX + deltaX));
      pageY = Math.min(pageYMax, Math.max(pageYMin, pageY + deltaY));

      await page.mouse.move(pageX, pageY);

      const currentSizeString = await panel.getAttribute("data-panel-size");
      const currentSize = parseFloat(currentSizeString);

      if (isExpanding) {
        if (currentSize >= nextSize) {
          break;
        }
      } else {
        if (currentSize <= nextSize) {
          break;
        }
      }
    }

    await verifyFuzzySizes(page, 0.1, ...expectedSizes);
  }

  await page.mouse.up();
}

export async function verifyPanelSize(locator: Locator, expectedSize: number) {
  await expect(await locator.getAttribute("data-panel-size")).toBe(
    expectedSize.toFixed(1)
  );
}
