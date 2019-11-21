const onlyWhitespaceRegex = /^\s+$/;

/**
 * ChunkReplacement represents a Chunk and its corresponding replacement text.
 * @param {!Chunk} chunk the chunk this ChunkReplacement represents
 * @param {!String} text the replacement text for this chunk
 */
class ChunkReplacement {
  constructor(chunk, text) {
    this.text = text;
    this.chunk = chunk;
  }

  get isOnlyWhitespace() {
    return this.text && this.text.match(onlyWhitespaceRegex);
  }

  get isNonWhitespaceText() {
    return this.text !== '' && !this.text.match(onlyWhitespaceRegex);
  }

/**
 * Trim leading and trailing whitespace from a given list of chunk replacements
 * @param {!Array<ChunkReplacement>} chunkReplacements to trim
 * @return {!Array<ChunkReplacement>} trimmed chunkReplacements
 */
  static trimWhitespace(chunkReplacements) {
    if (chunkReplacements.length === 0) {
      return [];
    }

    const indicies = new Array(chunkReplacements.length);
    indicies.fill(true);

    for (let i = chunkReplacements.length - 1; i >= 0; i--) {
      const chunkReplacement = chunkReplacements[i];
      if (chunkReplacement.isNonWhitespaceText) {
        break;
      }
      indicies[i] = false;
    }

    for (let i = 0; i < chunkReplacements.length; i++) {
      const chunkReplacement = chunkReplacements[i];
      if (chunkReplacement.isNonWhitespaceText) {
        break;
      }
      indicies[i] = false;
    }

    chunkReplacements = chunkReplacements.filter((chunk, index) => {
      return indicies[index];
    });

    if (chunkReplacements.length === 0) {
      return [];
    }

    return chunkReplacements;
  }

/**
 * Trim leading and trailing reply delimiters from a given list of chunk replacements
 * will trim the replacement if .isReplyDelimiter is true and it matches a correspoding
 * end chunk. Assumes whitespace has been trimmed
 * @param {!Array<ChunkReplacement>} chunkReplacements to trim
 * @return {!Array<ChunkReplacement>} trimmed chunkReplacements
 */
  static trimReplyDelimiters(chunkReplacements) {
    if (chunkReplacements.length === 0) {
      return [];
    }

    let startChunk;
    let endChunk;
    let matching = false;
    do {
      if (matching) {
        chunkReplacements = chunkReplacements.slice(1, chunkReplacements.length - 1);
      }
      startChunk = chunkReplacements[0].chunk;
      endChunk = chunkReplacements[chunkReplacements.length - 1].chunk;
      matching = startChunk.isReplyDelimiter && endChunk.isReplyDelimiter
        && !startChunk.isEnd && endChunk.isEnd
        && startChunk.tagName === endChunk.tagName;
    } while (matching);
    return chunkReplacements;
  }

  static removeUnterminatedTags(chunkReplacements) {
    if (chunkReplacements.length === 0) {
      return [];
    }

    const indicies = new Array(chunkReplacements.length);
    indicies.fill(true);

    const openChunkIndiciesByName = {};

    chunkReplacements.forEach((chunkReplacement, index) => {
      const chunk = chunkReplacement.chunk;
      if (chunk.isText || chunkReplacement.isOnlyWhitespace) {
        return true;
      }
      const openChunkIndicies = openChunkIndiciesByName[chunk.tagName] || [];
      if (chunk.isEnd) {
        if (openChunkIndicies.length === 0) {
          indicies[index] = false;
          return true;
        }
        openChunkIndicies.pop();
      } else {
        openChunkIndicies.push(index);
      }
      openChunkIndiciesByName[chunk.tagName] = openChunkIndicies;
      return true;
    });

    for (const key in openChunkIndiciesByName) {
      const values = openChunkIndiciesByName[key];
      for (const index of values) {
        indicies[index] = false;
      }
    }
    return chunkReplacements.filter((chunk, index) => {
      return indicies[index];
    });
  }

  static removeOrphanedListItems(chunkReplacements) {
    if (chunkReplacements.length === 0) {
      return [];
    }

    let listLevel = 0;
    return chunkReplacements.filter((chunkReplacement, index) => {
      const chunk = chunkReplacement.chunk;
      if (chunk.isList) {
        if (chunk.isEnd) {
          listLevel--;
        } else {
          listLevel++;
        }
      } else if (listLevel === 0 && chunk.isListItem) {
        return false;
      }
      return true;
    });
  }
}

module.exports = ChunkReplacement;
