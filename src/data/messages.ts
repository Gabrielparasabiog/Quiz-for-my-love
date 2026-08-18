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

export type MessageKind = 'correct' | 'retry' | 'timeout' | 'milestone' | 'completion';

export function createMessageBags(random = Math.random): Record<MessageKind, ShuffleBag<string>> {
  return {
    correct: new ShuffleBag(correctMessages, random),
    retry: new ShuffleBag(retryMessages, random),
    timeout: new ShuffleBag(timeoutMessages, random),
    milestone: new ShuffleBag(milestoneMessages, random),
    completion: new ShuffleBag(completionMessages, random),
  };
}
