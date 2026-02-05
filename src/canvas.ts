import type { App } from "@slack/bolt";

export async function updateChannelCanvas(app: App) {
  const canvasId = Bun.env.SLACK_CANVAS_ID;

  if (!canvasId) {
    console.warn("No canvas ID found. Skipping update.");
    return;
  }

  let readmeContent = await Bun.file("./README.md").text();

  // remove html divs
  readmeContent = readmeContent.replace(
    /<div align="center">[\s\S]*?<\/div>/g,
    "",
  );

  // convert relative links to plain text
  readmeContent = readmeContent.replace(/\[([^\]]+)\]\((?!http)[^)]+\)/g, "$1");

  // fix code block indentation issues
  readmeContent = readmeContent.replace(/^(\s+)(```)/gm, "$2").trim();

  try {
    console.log("Updating canvas body...");
    await app.client.canvases.edit({
      canvas_id: canvasId,
      changes: [
        {
          operation: "replace",
          document_content: {
            type: "markdown",
            markdown: readmeContent,
          },
        },
      ],
    });

    console.log("Renaming canvas...");
    await app.client.canvases.edit({
      canvas_id: canvasId,
      changes: [
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          operation: "rename" as any,
          title_content: {
            type: "markdown",
            markdown: "README.md",
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      ],
    });

    console.log("Canvas updated and renamed successfully.");
  } catch (error) {
    console.error("Failed to update canvas:", error);
  }
}
