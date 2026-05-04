import { useState } from 'react';
import { initials, cn } from '../../lib/utils';

export const CandidateAvatar = ({ src, name, size = 40, className }) => {
  const [errored, setErrored] = useState(false);
  const dim = { width: size, height: size };
  const inits = initials(name);
  const showFallback = !src || errored;

  return (
    <div
      style={dim}
      className={cn(
        'inline-flex items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-brand to-brand-700 text-white font-semibold ring-2 ring-white shadow-sm',
        className
      )}
    >
      {!showFallback ? (
        <img
          src={src}
          alt={name}
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span style={{ fontSize: size * 0.38 }}>{inits || '?'}</span>
      )}
    </div>
  );
};
