import Dexie from 'dexie';

// IndexedDB Schema
export const db = new Dexie('EnglishLearningStudio');

db.version(1).stores({
  // Books/Texts table
  books: '++id, title, content, language, uploadDate, lastReadPosition, totalSentences, progress',
  
  // Words/Vocabulary table
  words: '++id, word, translation, sentence, bookId, dateAdded, status, reviewCount, easeFactor, interval, dueDate',
  
  // Flashcards table (for spaced repetition)
  flashcards: '++id, wordId, front, back, ease, interval, repetitions, dueDate, lastReview',
  
  // User progress/statistics
  stats: '++id, date, readingTime, wordsLearned, cardsReviewed, speakingPractice, streak',
  
  // App settings
  settings: 'key, value'
});

// Default settings
export const defaultSettings = {
  dailyCardLimit: 10,
  reviewTimeLimit: 20, // minutes
  ttsVoice: 'en-US',
  ttsRate: 1.0,
  ttsVolume: 1.0,
  darkMode: true,
  streakStartDate: null,
  lastActiveDate: null
};

// Initialize default settings
export async function initializeSettings() {
  const existingSettings = await db.settings.toArray();
  if (existingSettings.length === 0) {
    const settingsArray = Object.entries(defaultSettings).map(([key, value]) => ({ key, value }));
    await db.settings.bulkAdd(settingsArray);
  }
}

// Get setting by key
export async function getSetting(key) {
  const setting = await db.settings.get(key);
  return setting ? setting.value : defaultSettings[key];
}

// Update setting
export async function updateSetting(key, value) {
  await db.settings.put({ key, value });
}

// SuperMemo SM-2 Algorithm for spaced repetition
export function calculateNextReview(quality, easeFactor, interval, repetitions) {
  // quality: 0-5 (0 = complete blackout, 5 = perfect response)
  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Incorrect response - restart
    newInterval = 1;
    newRepetitions = 0;
  }

  // Update ease factor
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    dueDate: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000)
  };
}

// Add a new book
export async function addBook(title, content) {
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  const book = {
    title,
    content,
    language: 'en-US',
    uploadDate: new Date(),
    lastReadPosition: 0,
    totalSentences: sentences.length,
    progress: 0
  };
  return await db.books.add(book);
}

// Add a new word
export async function addWord(word, translation, sentence, bookId, status = 'learning') {
  const wordData = {
    word: word.toLowerCase(),
    translation,
    sentence,
    bookId,
    dateAdded: new Date(),
    status, // 'learning', 'known', 'unknown'
    reviewCount: 0,
    easeFactor: 2.5,
    interval: 0,
    dueDate: new Date()
  };
  return await db.words.add(wordData);
}

// Get words due for review today
export async function getDueWords(limit = 20) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return await db.words
    .where('dueDate')
    .belowOrEqual(today)
    .and(word => word.status !== 'known')
    .limit(limit)
    .toArray();
}

// Update word after review
export async function reviewWord(wordId, quality) {
  const word = await db.words.get(wordId);
  if (!word) return;

  const { easeFactor, interval, repetitions, dueDate } = calculateNextReview(
    quality,
    word.easeFactor,
    word.interval,
    word.reviewCount
  );

  await db.words.update(wordId, {
    easeFactor,
    interval,
    reviewCount: repetitions,
    dueDate,
    status: quality >= 4 && repetitions > 5 ? 'known' : 'learning'
  });
}

// Update streak
export async function updateStreak() {
  const today = new Date().toDateString();
  const lastActive = await getSetting('lastActiveDate');
  const streakStart = await getSetting('streakStartDate');

  if (!lastActive) {
    // First time user
    await updateSetting('lastActiveDate', today);
    await updateSetting('streakStartDate', today);
    return 1;
  }

  const lastActiveDate = new Date(lastActive);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastActiveDate.toDateString() === today) {
    // Already counted today
    const start = new Date(streakStart);
    return Math.floor((new Date() - start) / (1000 * 60 * 60 * 24)) + 1;
  } else if (lastActiveDate.toDateString() === yesterday.toDateString()) {
    // Continuing streak
    await updateSetting('lastActiveDate', today);
    const start = new Date(streakStart);
    return Math.floor((new Date() - start) / (1000 * 60 * 60 * 24)) + 1;
  } else {
    // Streak broken
    await updateSetting('lastActiveDate', today);
    await updateSetting('streakStartDate', today);
    return 1;
  }
}

// Get today's statistics
export async function getTodayStats() {
  const today = new Date().toDateString();
  const stats = await db.stats.where('date').equals(today).first();
  
  if (!stats) {
    const newStats = {
      date: today,
      readingTime: 0,
      wordsLearned: 0,
      cardsReviewed: 0,
      speakingPractice: 0,
      streak: await updateStreak()
    };
    await db.stats.add(newStats);
    return newStats;
  }
  
  return stats;
}

// Update today's stats
export async function updateTodayStats(updates) {
  const today = new Date().toDateString();
  const stats = await getTodayStats();
  await db.stats.where('date').equals(today).modify(updates);
}

// Initialize database
export async function initializeDatabase() {
  try {
    await db.open();
    await initializeSettings();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
}
