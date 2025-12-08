import React from 'react';

import { usePdfContext } from '../pdf/PdfContext';

export const Toolbar = () => {
  const { scale, setScale } = usePdfContext();

  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 16px', borderBottom: '1px solid #eee' }}>
      <button onClick={() => setScale((s) => Math.max(s - 0.2, 0.4))}>-</button>
      <span>{(scale * 100).toFixed(0)}%</span>
      <button onClick={() => setScale((s) => Math.min(s + 0.2, 4))}>+</button>
      <button onClick={() => setScale(1.2)}>Reset</button>
    </div>
  );
};
