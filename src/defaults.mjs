// How gtm.js runs, the same for every product. What belongs to one product
// (its name, topics, communities, rivals) lives in the workspace's gtm.json,
// written by the setup on the screen, and wins over anything here.
export const defaults = {
  port: 4810,
  everyMinutes: 30,
  firstRunDays: 7,
  morningHour: 9,
  weeklyDay: 1,
  widePerDay: 50,
  redditPages: 6,
  voiceModel: 'onnx-community/whisper-base',
  voiceLanguage: 'english',
  noDashes: false,
  product: {},
  me: {},
  topics: [],
  phrases: [],
  redditRooms: [],
  githubRepos: [],
  rivals: [],
  switchStatus: {},
  switchNames: [],
  // A post is read when it sounds like a person asking or struggling...
  signals: [
    '?', 'how do', 'how to', 'struggling', 'tired of', 'alternative', 'too many', 'overkill', 'bill',
    'pricing', 'lock-in', 'locked in', 'nightmare', 'confused', 'overwhelmed', 'recommend', 'should i',
    'is there', 'what do you use', "can't", 'cannot', 'broke', 'breaking', 'frustrated', 'pain', 'stuck', 'help',
  ],
  // ...and does not open like an advert.
  adverts: [
    'i built', 'i made', 'we built', 'show hn', 'launching', 'just launched', 'introducing', "we're hiring",
    'hiring', 'check out', 'announcing', 'released', 'disclosure', 'for hire',
  ],
}
