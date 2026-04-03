'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'What is Kumami World?',
    answer:
      'Kumami World is a Web3 ecosystem that brings together news, education, gaming, AI innovation, and on-chain opportunities in one platform, helping users learn, explore, and participate in the Web3 economy and community.',
  },
  {
    question: 'Who is Kumami World for?',
    answer:
      'Kumami World is built for everyone whether you are students, Web3 beginners, gamers, creators, or anyone interested in learning about AI, Crypto and Web 3 ecosystem.',
  },
  {
    question: 'What can I do on Kumami World?',
    answer:
      'You can stay updated through our News Portal, learn Web3 skills via educational content, explore Play & Earn games, experiment with AI Labs, earn rewards through staking, and join gaming communities through our Gaming Guild.',
  },
  {
    question: 'Do I need prior Web3 or crypto experience to use Kumami World?',
    answer:
      'No. Kumami World is designed to be beginner-friendly. Our content ranges from introductory learning materials to advanced market insights, so you can start at your own pace!',
  },
  {
    question: 'Is Kumami World free to use?',
    answer:
      'Kumami World offers both free and paid access. Free users can explore selected news, learning content, and ecosystem features. Kumami Pro unlocks advanced tools and insights, including deep market analysis, AI-powered portfolio management, airdrop tracking, market alerts, and exclusive live Q&A sessions.',
  },
  {
    question: 'How is Kumami World different from other Web3 platforms?',
    answer:
      'Kumami World combines learning, real-time insights, gaming, AI tools, global community, and earning opportunities into one connected ecosystem, making Web3 more accessible and practical for everyday users.',
  },
  {
    question: 'What should I do to get started?',
    answer:
      "Follow all of our Social Media to get the latest information and content! You can continue by exploring our News Portal to stay informed, then dive into our educational content to understand Web3 fundamentals. You can also try games, explore AI Labs, or join the community based on your interests. When you're ready for deeper insights and tools, you can upgrade to Kumami Pro anytime.",
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="w-full bg-[#050608] px-4 py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-center text-3xl md:text-4xl font-bold text-[#40e0d0] mb-8">
          Frequently Asked Questions
        </h2>
        <div className="flex flex-col gap-3">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <button
                key={item.question}
                className={`w-full text-left rounded-xl px-4 py-3 md:px-5 md:py-4 bg-[#16171b] text-white transition-colors duration-150 ${
                  isOpen ? 'bg-[#22242a]' : 'hover:bg-[#1f2025]'
                }`}
                onClick={() => toggleIndex(index)}
                type="button"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base md:text-lg font-semibold">
                    {item.question}
                  </span>
                  <span className="text-xl md:text-xl">
                    {isOpen ? '−' : '+'}
                  </span>
                </div>
                {isOpen && (
                  <p className="mt-2 text-sm md:text-base leading-relaxed text-gray-300">
                    {item.answer}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
