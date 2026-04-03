'use client';

import '@/styles/Contact.css';

const Contact = () => {
  return (
    <section id="contact" className="contact-section">
      <div className="container text-center">
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
          <p className="mb-3">Have questions? We&apos;d love to hear from you!</p>
          <p className="mb-4">
            Email:{' '}
            <a href="mailto:team@kumami.world" className="contact-link">
              team@kumami.world
            </a>
          </p>
          <button
            onClick={() => window.open('https://linktr.ee/kumamiworld', '_blank')}
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
