/**
 * Human-like behavior utilities for anti-spam compliance
 */

/**
 * Random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random delay in milliseconds (for BullMQ job delay)
 */
function humanDelay(minMs = 2000, maxMs = 8000) {
  return randomInt(minMs, maxMs);
}

/**
 * Pick a random item from an array using weighted distribution
 */
function pickRandom(items) {
  if (!items || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Generate a typing delay based on message length (simulates reading)
 */
function typingDelay(messageLength) {
  // ~50ms per character, capped between 1s and 4s
  return Math.min(4000, Math.max(1000, messageLength * 50));
}

module.exports = { randomInt, humanDelay, pickRandom, typingDelay };
