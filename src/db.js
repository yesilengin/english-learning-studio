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

db.version(2).stores({
  books: '++id, title, content, language, uploadDate, lastReadPosition, totalSentences, progress',
  words: '++id, word, translation, sentence, bookId, dateAdded, status, reviewCount, easeFactor, interval, dueDate',
  flashcards: '++id, wordId, front, back, ease, interval, repetitions, dueDate, lastReview',
  stats: '++id, date, readingTime, wordsLearned, cardsReviewed, speakingPractice, streak',
  settings: 'key, value',
  translationCache: 'word, savedAt'
});

db.version(3).stores({
  books: '++id, cloudId, title, content, language, uploadDate, lastReadPosition, totalSentences, progress',
  words: '++id, word, translation, sentence, bookId, dateAdded, status, reviewCount, easeFactor, interval, dueDate',
  flashcards: '++id, wordId, front, back, ease, interval, repetitions, dueDate, lastReview',
  stats: '++id, date, readingTime, wordsLearned, cardsReviewed, speakingPractice, streak',
  settings: 'key, value',
  translationCache: 'word, savedAt'
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
export async function addBook(title, content, extra = {}) {
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  const book = {
    title,
    content,
    language: 'en-US',
    uploadDate: new Date(),
    lastReadPosition: 0,
    totalSentences: sentences.length,
    progress: 0,
    cloudId: extra.cloudId || crypto.randomUUID(),
    synced: Boolean(extra.synced)
  };
  return await db.books.add(book);
}

export const LEVEL_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }

// Add a new word
export async function addWord(word, translation, sentence, bookId, status = 'learning') {
  const wordData = {
    word: word.toLowerCase(),
    translation,
    sentence,
    bookId,
    dateAdded: new Date(),
    status, // 'learning', 'known', 'unknown'
    level: 1,
    reviewCount: 0,
    easeFactor: 2.5,
    interval: 0,
    dueDate: new Date()
  };
  return await db.words.add(wordData);
}

export async function setWordLevel(wordId, level) {
  const days = LEVEL_DAYS[level] || 1
  await db.words.update(wordId, {
    level,
    interval: days,
    dueDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    status: 'learning'
  })
}

export async function deleteWord(wordId) {
  await db.words.delete(wordId)
  await db.flashcards.where('wordId').equals(wordId).delete()
}

export async function getWordsByLevel(level) {
  const words = await db.words.toArray()
  return words.filter((word) => (word.level || 1) === level)
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

// Sample books for first-time users
const SAMPLE_BOOKS = [
  {
    title: "Tom and His Dog",
    content: `Tom and His Dog

Tom is a boy. He is ten years old. Tom has a dog. The dog's name is Max. Max is big and brown.

Tom loves Max. Max loves Tom. They play every day. They play in the park. The park is near Tom's house.

One day, Tom throws a ball. Max runs fast. Max catches the ball. Tom is happy. Max is happy too.

Tom says, "Good dog, Max!" Max wags his tail. Tom gives Max a treat. Max eats the treat.

It is time to go home. Tom and Max walk home. Tom's mom is at home. She smiles.

"Did you have fun?" asks Mom.

"Yes!" says Tom. "Max is the best dog!"

Tom and Max are tired. They sit on the couch. Tom reads a book. Max sleeps next to Tom.

Tom pets Max. Max is warm and soft. Tom is happy. Max is happy.

The end.`
  },
  {
    title: "The Lost Cat",
    content: `The Lost Cat

Sara has a cat. The cat's name is Whiskers. Whiskers is white with black spots.

One morning, Sara wakes up. She looks for Whiskers. Whiskers is not in the house. Sara is worried.

"Mom, I can't find Whiskers!" says Sara.

Mom helps Sara look. They look in every room. They look under the bed. They look in the closet. No Whiskers.

Sara goes outside. She calls, "Whiskers! Whiskers!" She walks around the yard. She looks behind the trees. Still no Whiskers.

Sara is sad. She sits on the porch. Then she hears a sound. "Meow!"

Sara looks up. Whiskers is in the tree! The cat climbed too high. Now Whiskers is scared.

Sara's dad gets a ladder. He climbs up. He reaches for Whiskers. Whiskers jumps into his arms.

Dad climbs down. Sara hugs Whiskers. "I'm so happy you're safe!" she says.

Whiskers purrs. Sara gives Whiskers food and water. Whiskers eats and drinks. Then Whiskers takes a nap.

Sara pets Whiskers gently. "Don't climb so high again," she whispers.

The end.`
  },
  {
    title: "The Brave Soldier",
    content: `The Brave Soldier

Jake is a soldier. He works hard every day. He protects his country. Jake is brave and strong.

Jake has friends in the army. They train together. They learn to work as a team. They help each other.

One day, Jake's team gets a mission. They must go to a difficult place. The weather is bad. It is cold and windy.

Jake and his team prepare carefully. They check their equipment. They make a plan. Everyone has a job to do.

The mission is not easy. There are many challenges. But Jake stays calm. He remembers his training. He follows the plan.

Jake's team works together. They communicate well. They trust each other. They complete the mission successfully.

When they return, everyone is proud. The captain says, "Good work, team!"

Jake is tired but happy. He knows his job is important. He is proud to serve his country.

That night, Jake calls his family. He talks to his mom and dad. They are proud of him too.

Jake thinks about his team. He knows they will face more challenges. But he is ready. He is a brave soldier.

The end.`
  }
];

// Initialize database
export async function initializeDatabase() {
  try {
    await db.open();
    await initializeSettings();
    
    // Load sample books on first use
    const bookCount = await db.books.count();
    if (bookCount === 0) {
      console.log('📚 Loading sample books...');
      for (const book of SAMPLE_BOOKS) {
        await db.books.add({
          title: book.title,
          content: book.content,
          uploadedAt: new Date(),
          lastReadPosition: 0,
          progress: 0
        });
      }
      console.log('✅ Sample books loaded!');
    }
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
}
