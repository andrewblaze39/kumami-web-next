'use client';

import '@/styles/Contact.css';

const Contact = () => {
  return (
    <section id="contact" className="contact-section" style={{ background: '#000' }}>
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2
          className="section-title"
          style={{
            color: '#40e0d0',
            fontWeight: 'bold',
            fontSize: '2.5rem',
            marginBottom: '-0.5rem'
          }}
        >
          Get in Touch
        </h2>
        <div className="contact-box mb-5">
          <p className="mb-4">Have questions? We&apos;d love to hear from you!</p>
          <button
            onClick={() => window.open('https://discord.com/invite/5q3NnHFpYR', '_blank')}
            className="btn-main"
          >
            Join Our Community
          </button>
        </div>
      </div>
    </section>
  );
};

export default Contact;
