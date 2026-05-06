const FLIPPED_HORIZONTALLY_FLAG = 0x80000000 >>> 0;
const FLIPPED_VERTICALLY_FLAG = 0x40000000 >>> 0;
const FLIPPED_DIAGONALLY_FLAG = 0x20000000 >>> 0;
const GID_CLEAR_MASK = 0x1fffffff >>> 0;

function parseIntSafe(value, fallback = 0) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatSafe(value, fallback = 1) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseXmlDocument(xmlText, sourceUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error(`Invalid XML in ${sourceUrl}`);
  }
  return doc;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function parseTileAnimations(tileNodes) {
  const byLocalId = new Map();
  for (const tileNode of tileNodes) {
    const animationNode = tileNode.querySelector("animation");
    if (!animationNode) {
      continue;
    }
    const localTileId = parseIntSafe(tileNode.getAttribute("id"), -1);
    if (localTileId < 0) {
      continue;
    }
    const frames = [];
    for (const frameNode of animationNode.querySelectorAll("frame")) {
      frames.push({
        tileId: parseIntSafe(frameNode.getAttribute("tileid"), 0),
        durationMs: parseIntSafe(frameNode.getAttribute("duration"), 100)
      });
    }
    if (frames.length) {
      byLocalId.set(localTileId, frames);
    }
  }
  return byLocalId;
}

async function parseTilesetFromNode(tilesetNode, mapUrl) {
  const source = tilesetNode.getAttribute("source");
  const firstGid = parseIntSafe(tilesetNode.getAttribute("firstgid"), 1);

  let resolvedUrl = mapUrl;
  let rootNode = tilesetNode;

  if (source) {
    resolvedUrl = new URL(source, mapUrl).toString();
    const tsxText = await fetchText(resolvedUrl);
    const tsxDoc = parseXmlDocument(tsxText, resolvedUrl);
    const tsxTileset = tsxDoc.querySelector("tileset");
    if (!tsxTileset) {
      throw new Error(`Tileset file ${resolvedUrl} does not contain <tileset>.`);
    }
    rootNode = tsxTileset;
  }

  const imageNode = rootNode.querySelector("image");
  if (!imageNode) {
    throw new Error(`Tileset at ${resolvedUrl} does not define an <image>.`);
  }

  const tileWidth = parseIntSafe(rootNode.getAttribute("tilewidth"), 16);
  const tileHeight = parseIntSafe(rootNode.getAttribute("tileheight"), 16);
  const tileCount = parseIntSafe(rootNode.getAttribute("tilecount"), 0);
  const columns = parseIntSafe(rootNode.getAttribute("columns"), 1);
  const imageSource = imageNode.getAttribute("source");

  if (!imageSource) {
    throw new Error(`Tileset at ${resolvedUrl} has an image node without source.`);
  }

  const imageUrl = new URL(imageSource, resolvedUrl).toString();
  const imageWidth = parseIntSafe(imageNode.getAttribute("width"), tileWidth * columns);
  const imageHeight = parseIntSafe(imageNode.getAttribute("height"), tileHeight * Math.max(1, Math.ceil(tileCount / Math.max(1, columns))));
  const animationsByLocalId = parseTileAnimations(rootNode.querySelectorAll("tile"));

  return {
    firstGid,
    lastGid: firstGid + tileCount - 1,
    name: rootNode.getAttribute("name") || `tileset_${firstGid}`,
    tileWidth,
    tileHeight,
    tileCount,
    columns,
    imageUrl,
    imageWidth,
    imageHeight,
    animationsByLocalId
  };
}

function parseLayerDataTiles(dataNode) {
  const chunkNodes = dataNode.querySelectorAll("chunk");
  if (chunkNodes.length) {
    const chunkList = [];
    for (const chunkNode of chunkNodes) {
      const chunkText = chunkNode.textContent || "";
      const values = chunkText
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => Number.parseInt(entry, 10));

      chunkList.push({
        x: parseIntSafe(chunkNode.getAttribute("x"), 0),
        y: parseIntSafe(chunkNode.getAttribute("y"), 0),
        width: parseIntSafe(chunkNode.getAttribute("width"), 0),
        height: parseIntSafe(chunkNode.getAttribute("height"), 0),
        values
      });
    }
    return chunkList;
  }

  const inlineValues = (dataNode.textContent || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => Number.parseInt(entry, 10));

  return [
    {
      x: 0,
      y: 0,
      width: parseIntSafe(dataNode.parentNode?.getAttribute?.("width"), 0),
      height: parseIntSafe(dataNode.parentNode?.getAttribute?.("height"), 0),
      values: inlineValues
    }
  ];
}

function decodeTile(rawGidValue) {
  const rawUnsigned = (rawGidValue ?? 0) >>> 0;
  const flipH = (rawUnsigned & FLIPPED_HORIZONTALLY_FLAG) !== 0;
  const flipV = (rawUnsigned & FLIPPED_VERTICALLY_FLAG) !== 0;
  const flipD = (rawUnsigned & FLIPPED_DIAGONALLY_FLAG) !== 0;
  const gid = rawUnsigned & GID_CLEAR_MASK;

  return { gid, flipH, flipV, flipD };
}

function parseLayers(mapNode) {
  const layers = [];
  const mapBounds = {
    minTileX: Infinity,
    maxTileX: -Infinity,
    minTileY: Infinity,
    maxTileY: -Infinity
  };

  const directLayers = Array.from(mapNode.childNodes).filter((node) => node?.nodeType === 1 && node.localName === "layer");
  for (const layerNode of directLayers) {
    const dataNode = layerNode.querySelector("data");
    if (!dataNode) {
      continue;
    }

    const encoding = dataNode.getAttribute("encoding");
    if (encoding !== "csv") {
      throw new Error(`Layer "${layerNode.getAttribute("name") || "unnamed"}" must use CSV encoding.`);
    }

    const chunkList = parseLayerDataTiles(dataNode);
    const tiles = [];

    for (const chunk of chunkList) {
      const { x: chunkX, y: chunkY, width: chunkWidth, height: chunkHeight, values } = chunk;
      const expectedValues = chunkWidth * chunkHeight;
      if (chunkWidth <= 0 || chunkHeight <= 0 || values.length < expectedValues) {
        continue;
      }

      for (let index = 0; index < expectedValues; index += 1) {
        const raw = values[index] ?? 0;
        if (!raw) {
          continue;
        }

        const tileX = chunkX + (index % chunkWidth);
        const tileY = chunkY + Math.floor(index / chunkWidth);
        const decoded = decodeTile(raw);
        if (!decoded.gid) {
          continue;
        }

        tiles.push({
          x: tileX,
          y: tileY,
          gid: decoded.gid,
          flipH: decoded.flipH,
          flipV: decoded.flipV,
          flipD: decoded.flipD
        });

        mapBounds.minTileX = Math.min(mapBounds.minTileX, tileX);
        mapBounds.maxTileX = Math.max(mapBounds.maxTileX, tileX);
        mapBounds.minTileY = Math.min(mapBounds.minTileY, tileY);
        mapBounds.maxTileY = Math.max(mapBounds.maxTileY, tileY);
      }
    }

    layers.push({
      id: parseIntSafe(layerNode.getAttribute("id"), 0),
      name: layerNode.getAttribute("name") || "layer",
      opacity: parseFloatSafe(layerNode.getAttribute("opacity"), 1),
      visible: layerNode.getAttribute("visible") !== "0",
      tiles
    });
  }

  if (!Number.isFinite(mapBounds.minTileX)) {
    mapBounds.minTileX = 0;
    mapBounds.maxTileX = parseIntSafe(mapNode.getAttribute("width"), 1) - 1;
    mapBounds.minTileY = 0;
    mapBounds.maxTileY = parseIntSafe(mapNode.getAttribute("height"), 1) - 1;
  }

  return { layers, mapBounds };
}

function chooseTilesetForGid(tilesets, gid) {
  let winner = null;
  for (const tileset of tilesets) {
    if (gid >= tileset.firstGid && gid <= tileset.lastGid) {
      winner = tileset;
    }
  }
  return winner;
}

function buildAnimationLookup(tilesets) {
  const byGlobalGid = new Map();
  for (const tileset of tilesets) {
    for (const [localTileId, frameList] of tileset.animationsByLocalId.entries()) {
      const sourceGlobalGid = tileset.firstGid + localTileId;
      const frames = frameList.map((frame) => ({
        gid: tileset.firstGid + frame.tileId,
        durationMs: frame.durationMs
      }));
      byGlobalGid.set(sourceGlobalGid, frames);
    }
  }
  return byGlobalGid;
}

export async function loadTiledMap(mapPath) {
  const mapUrl = new URL(mapPath, window.location.href).toString();
  const mapText = await fetchText(mapUrl);
  const mapDoc = parseXmlDocument(mapText, mapUrl);
  const mapNode = mapDoc.querySelector("map");

  if (!mapNode) {
    throw new Error(`Map file ${mapUrl} does not contain <map>.`);
  }

  const tileWidth = parseIntSafe(mapNode.getAttribute("tilewidth"), 16);
  const tileHeight = parseIntSafe(mapNode.getAttribute("tileheight"), 16);
  const tilesetNodes = Array.from(mapNode.childNodes).filter((node) => node?.nodeType === 1 && node.localName === "tileset");
  const tilesets = [];

  for (const tilesetNode of tilesetNodes) {
    const parsedTileset = await parseTilesetFromNode(tilesetNode, mapUrl);
    tilesets.push(parsedTileset);
  }

  tilesets.sort((a, b) => a.firstGid - b.firstGid);

  const { layers, mapBounds } = parseLayers(mapNode);
  const animationsByGlobalGid = buildAnimationLookup(tilesets);

  return {
    url: mapUrl,
    orientation: mapNode.getAttribute("orientation") || "orthogonal",
    renderOrder: mapNode.getAttribute("renderorder") || "right-down",
    tileWidth,
    tileHeight,
    mapBounds,
    layers,
    tilesets,
    animationsByGlobalGid,
    resolveTileset(gid) {
      return chooseTilesetForGid(tilesets, gid);
    }
  };
}
