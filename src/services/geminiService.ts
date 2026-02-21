const AUTOMATED_RESPONSES = [
  {
    keywords: ["distance", "cold", "ignore", "disconnected", "far"],
    response: "I understand how painful that distance feels. Remember, you are a Diamond. Try this: 'I've noticed we've been a bit disconnected lately. I value our connection and would love to find some time to catch up properly. How are you feeling about us?'"
  },
  {
    keywords: ["fight", "argument", "sorry", "angry", "mad"],
    response: "Arguments are tough, but your peace is priority. Try this: 'I value our relationship more than being right. Can we try to understand each other's perspective again when we're both calm?'"
  },
  {
    keywords: ["boundary", "no", "stop", "respect", "space"],
    response: "Setting boundaries is an act of self-love. Try this: 'I need to set a boundary regarding our communication. I'm not comfortable with this behavior and I'd like us to find a healthier way to interact.'"
  },
  {
    keywords: ["hi", "hello", "hey", "help"],
    response: "Hello, Diamond! I'm your SOS Assistant. Tell me what's on your mind (e.g., 'he's being distant' or 'we had a fight') and I'll give you a script to protect your worth."
  }
];

export async function getChatResponse(message: string, _history: any[]) {
  // Simulate a small delay for "thinking" feel
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const lowerMsg = message.toLowerCase();
  
  for (const item of AUTOMATED_RESPONSES) {
    if (item.keywords.some(k => lowerMsg.includes(k))) {
      return item.response;
    }
  }

  return "I hear you, Diamond. Your worth is inherent and doesn't depend on his response. Try looking through our 'Setting Boundaries' or 'When He's Distant' categories for the perfect words to protect your heart.";
}
