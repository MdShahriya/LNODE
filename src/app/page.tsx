import React from 'react';
import "./page.css"

const LandingPage = () => {
  return (
    <div>
      <main className="flex flex-col items-center justify-center min-h-screen py-2">
        <section className="text-center">
          <h1 className="text-4xl font-bold">Welcome to TOPAY NODE</h1>
          <p className="mt-4 text-lg">A Decentralized Payment Gateway powered by TOPAY Foundation.</p>
          <button >Get Started</button>
        </section>
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Features</h2>
          <ul className="mt-4 space-y-2">
            <li>Secure Transactions</li>
            <li>Fast Payments</li>
            <li>Global Reach</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;