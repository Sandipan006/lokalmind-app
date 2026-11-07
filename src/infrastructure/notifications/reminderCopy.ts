import type { ReminderSlotName } from './reminderPlan';

export interface ReminderCopy {
  title: string;
  body: string;
}

// 14 per slot: no repeat for 14 uses of a slot (a plan is 56 reminders over about 15 days). Copy must stay true to the app:
// no memory claims (memory was removed), no price words, no other platform names.
export const REMINDER_COPY: Record<ReminderSlotName, readonly ReminderCopy[]> = {
  morning: [
    { title: 'Start the day sharp', body: 'Ask LokalMind to plan your top three tasks.' },
    { title: 'Morning brain dump', body: 'Type it out. Your chat stays on this phone.' },
    { title: 'Draft it before coffee cools', body: 'Need an email or a message? Ask LokalMind.' },
    { title: 'Quick question?', body: 'Get an answer on your phone, with no internet needed.' },
    { title: 'Sort your to-do list', body: 'Paste it in and get a clean plan.' },
    { title: 'Learn one thing today', body: 'Ask LokalMind to explain anything in simple words.' },
    { title: 'Warm-up prompt', body: 'Try: "Give me a 10-minute workout plan."' },
    { title: 'Write better today', body: 'Paste a rough note and ask for a tidy rewrite.' },
    { title: 'Breakfast ideas?', body: 'Tell LokalMind what is in your kitchen.' },
    { title: 'Commute thoughts', body: 'On a train or offline, LokalMind still works.' },
    { title: 'Translate it', body: 'Ask for a quick translation, no connection needed.' },
    { title: "Today's focus", body: 'Ask for one small step you can finish before noon.' },
    { title: 'New day, new prompt', body: 'Open LokalMind and ask what you have been wondering.' },
    { title: 'Make a checklist', body: 'Describe a task and get the steps.' },
  ],
  midday: [
    { title: 'Lunch-break question', body: 'Got five minutes? Ask LokalMind anything.' },
    { title: 'Stuck on something?', body: 'Describe the problem and talk it through.' },
    { title: 'Explain it simply', body: 'Paste confusing text and ask for a short summary.' },
    { title: 'Reply faster', body: 'Ask LokalMind to draft a polite reply.' },
    { title: 'Midday idea', body: 'Ask for names, captions or gift ideas.' },
    { title: 'Study break', body: 'Quiz yourself: ask for five practice questions.' },
    { title: 'Fix the wording', body: 'Paste a sentence and ask for a clearer version.' },
    { title: 'Quick maths check', body: 'Ask LokalMind to walk through a calculation.' },
    { title: 'Cook something new', body: 'Ask for a simple recipe from what you have.' },
    { title: 'Compare options', body: 'List your choices and ask for pros and cons.' },
    { title: 'Learn a word', body: 'Ask for a new word with an example.' },
    { title: 'Think out loud', body: 'Chat through a decision. Nothing leaves your phone.' },
    { title: 'Shorter, please', body: 'Paste a long message and ask for two lines.' },
    { title: 'Try another model', body: 'Pick a different model in the Models tab.' },
  ],
  evening: [
    { title: 'Wind-down chat', body: 'Ask LokalMind to help you reflect on today.' },
    { title: 'Plan tomorrow', body: 'List what is on and get a simple order.' },
    { title: 'Dinner decided?', body: 'Ask for a quick meal idea.' },
    { title: 'Practise a language', body: 'Ask for a short conversation to practise.' },
    { title: 'Private by design', body: 'Your chats stay on your device. Pick up where you left off.' },
    { title: 'Draft that message', body: 'Tricky text to send? Ask for a few versions.' },
    { title: 'Teach me something', body: 'Pick any topic and ask for a five-minute lesson.' },
    { title: 'Brainstorm', body: 'Throw rough ideas at LokalMind and see what sticks.' },
    { title: 'Learn something odd', body: 'Ask for a surprising fact and the story behind it.' },
    { title: 'Review your week', body: 'Describe your week and ask what to do next.' },
    { title: 'Story time', body: 'Ask for a short story with your own twist.' },
    { title: 'Tidy your notes', body: 'Paste messy notes and get a clean outline.' },
    { title: 'Prep for tomorrow', body: "Ask for talking points for tomorrow's meeting." },
    { title: 'Your chats are waiting', body: 'Open LokalMind and continue a thread.' },
  ],
  night: [
    { title: 'Before you sleep', body: 'Ask LokalMind for a calm bedtime story.' },
    { title: 'One last question', body: 'Curious about something? Ask now.' },
    { title: 'Quiet-hour thinking', body: 'Write down what is on your mind. It stays private.' },
    { title: "Tomorrow's top task", body: 'Pick one thing and ask for a first step.' },
    { title: 'Wind-down routine', body: 'Ask for an easy routine to help you relax.' },
    { title: 'Late-night curiosity', body: 'Ask how something works.' },
    { title: 'Tiny journal', body: 'Type three lines about today.' },
    { title: 'Read less, know more', body: 'Paste an article and ask for the key points.' },
    { title: 'Plan the weekend', body: 'Ask for ideas that fit your mood.' },
    { title: 'Explain what you saw', body: 'Ask LokalMind to explain something from today.' },
    { title: 'Gratitude prompt', body: 'Ask for a short prompt, then answer it.' },
    { title: 'Offline and ready', body: 'No signal needed. Open LokalMind anytime.' },
    { title: 'Goodnight prompt', body: 'End the day with one good question.' },
    { title: 'See you soon', body: 'LokalMind is here whenever you want to chat.' },
  ],
};
