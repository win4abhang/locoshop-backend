import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Welcome to LocoShop</h1>
      <p>Find nearby shops and services easily</p>
      <Link to="/stores">
        <button style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>Search Stores</button>
      </Link>
    </div>
  );
};

export default HomePage;
