import { ShuffleBag } from '../core/shuffleBag';

export const correctMessages = [
  'That was beautiful work, My Love. Keep shining. —Gab',
  'Look at you making progress! I am so proud of you. —Gab',
  'Correct and confident. That is my favorite combination. —Gab',
  'You got it, love. One more little victory in the books. —Gab',
  'Your focus is showing. I knew you could do this. —Gab',
  'Smart, steady, and unstoppable. —Gab',
  'Another point for the brightest review buddy ever. —Gab',
  'That answer had your name written all over it. —Gab',
  'You are building something amazing, one answer at a time. —Gab',
  'Correct! I am cheering for you from the front row. —Gab',
  'Your hard work is becoming confidence. —Gab',
  'That was a lovely little win. Keep going, My Love. —Gab',
];

export const retryMessages = [
  'No worries, My Love. This one gets another chance later. —Gab',
  'A small miss, not a stop sign. You are still doing great. —Gab',
  'Breathe, reset, and come back stronger. I believe in you. —Gab',
  'Every retry is practice turning into mastery. —Gab',
  'That one can wait in the comeback queue. You have got this. —Gab',
  'Mistakes are allowed here; giving up is not required. —Gab',
  'Still proud of you, especially when the question gets tricky. —Gab',
  'One tough question cannot outlast your determination. —Gab',
  'Keep your heart calm and your mind curious. —Gab',
  'Not quite this time, love. Your next try will be wiser. —Gab',
  'The comeback is already scheduled. —Gab',
  'You are learning, not losing. Keep moving. —Gab',
];

export const lastChanceMessages = [
  'Last try for this one, My Love. Give it your calmest, bravest thought. —Gab',
  'One final look, then we let this question go and keep your momentum. —Gab',
  'This is your last attempt here; I am still cheering just as loudly. —Gab',
  'No pressure, love. Trust what you have studied and take this last shot. —Gab',
  'If this one stays tricky, it becomes a note for your next review—not a judgment. —Gab',
  'Last chance, brightest heart. Breathe in, read twice, and choose with courage. —Gab',
  'You do not have to be perfect to make progress. Give this final try your best. —Gab',
  'Whatever happens on this item, I am proud of the way you kept showing up. —Gab',
];

export const timeoutMessages = [
  'Time took that round, but you still get another shot. —Gab',
  'No pressure, My Love. Reset your pace and try again later. —Gab',
  'A slow breath can make room for a strong answer. —Gab',
  'The clock moved on; your progress does too. —Gab',
  'You are not behind. You are practicing under pressure. —Gab',
  'This question is coming back with a little more time in your heart. —Gab',
];

export const milestoneMessages = [
  'Quarter mastered! Look how far you are already going. —Gab',
  'Halfway to mastery, My Love. I am celebrating you. —Gab',
  'Three quarters done! Your consistency is gorgeous. —Gab',
];

export const completionMessages = [
  'You mastered the whole bank! I am unbelievably proud of you. —Gab',
  'Board-exam energy: focused, brave, and finished. I love seeing you win. —Gab',
  'You did it, My Love. Every retry became proof of your strength. —Gab',
];

export const loveNoteMessages = [
  'My Love, your effort is the kind of beautiful that lasts. —Gab',
  'I hope you feel how much I believe in you, even between two tricky choices. —Gab',
  'You are allowed to learn slowly; I will still be proud of every brave step. —Gab',
  'Your dream is worth the patience you are giving it today. —Gab',
  'If your mind feels tired, let your heart remember why you started. —Gab',
  'You make hard things look softer because you keep returning with courage. —Gab',
  'I am sending you a quiet hug for this question and a loud cheer for the next. —Gab',
  'The review may be long, but my faith in you is longer. —Gab',
  'You are not racing anyone, love. You are becoming more ready every minute. —Gab',
  'Your small wins are adding up to something extraordinary. —Gab',
  'I love the way you keep trying even when the answer does not come quickly. —Gab',
  'You have a brave heart and a capable mind—use both gently today. —Gab',
  'One question cannot measure you; your persistence says so much more. —Gab',
  'Take a breath, My Love. You already carry more preparation than you think. —Gab',
  'I am proud of your discipline, your hope, and the way you keep learning. —Gab',
  'Your future self is cheering for the work you are doing right now. —Gab',
  'You are doing enough for this moment. Read carefully and be kind to yourself. —Gab',
  'Every page you studied is quietly standing with you here. —Gab',
  'You make me smile every time you choose to keep going. —Gab',
  'Let today be proof that courage can look like answering one item at a time. —Gab',
  'I am in your corner, in every pause, every retry, and every little victory. —Gab',
  'Your focus is precious, so protect it with one calm breath before you choose. —Gab',
  'The goal is big, but so is your heart. Keep moving, sweetheart. —Gab',
  'I believe in the person you are becoming, not only the result you will earn. —Gab',
  'You are my favorite kind of determined: gentle, steady, and impossible to stop. —Gab',
  'Even the difficult items are helping you meet your strongest self. —Gab',
  'You do not need perfect confidence to take the next step. I am proud already. —Gab',
  'Your hard work has a rhythm now. Trust it, My Love. —Gab',
  'When you feel nervous, remember: you have prepared, and you are not alone. —Gab',
  'Keep your hope close. I will keep my cheer even closer. —Gab',
];

export type MessageKind = 'correct' | 'retry' | 'lastChance' | 'timeout' | 'milestone' | 'completion' | 'loveNote';

export function createMessageBags(random = Math.random): Record<MessageKind, ShuffleBag<string>> {
  return {
    correct: new ShuffleBag(correctMessages, random),
    retry: new ShuffleBag(retryMessages, random),
    lastChance: new ShuffleBag(lastChanceMessages, random),
    timeout: new ShuffleBag(timeoutMessages, random),
    milestone: new ShuffleBag(milestoneMessages, random),
    completion: new ShuffleBag(completionMessages, random),
    loveNote: new ShuffleBag(loveNoteMessages, random),
  };
}
