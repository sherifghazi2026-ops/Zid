import React, { createContext, useState, useContext } from 'react';

const TermsContext = createContext();

export const TermsProvider = ({ children }) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState(null);

  const acceptTerms = () => {
    setTermsAccepted(true);
    setTermsAcceptedAt(new Date().toISOString());
  };

  const resetTerms = () => {
    setTermsAccepted(false);
    setTermsAcceptedAt(null);
  };

  return (
    <TermsContext.Provider value={{ termsAccepted, termsAcceptedAt, acceptTerms, resetTerms }}>
      {children}
    </TermsContext.Provider>
  );
};

export const useTerms = () => {
  const context = useContext(TermsContext);
  if (!context) throw new Error('useTerms must be used within a TermsProvider');
  return context;
};
