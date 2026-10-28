import React from 'react';
import { useNavigate } from 'react-router-dom';

const TOKEN_PATTERN = /(#(?:[A-Za-z0-9_]+)|@(?:[A-Za-z0-9_]+))/g;

function RichText({ text, className = '' }) {
  const navigate = useNavigate();

  if (!text) {
    return null;
  }

  const parts = text.split(TOKEN_PATTERN);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) {
          return null;
        }
        if (part.startsWith('#')) {
          const tag = part.slice(1);
          return (
            <span
              key={`${part}-${index}`}
              className="rich-text-token hashtag interactive"
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/hashtags/${tag}`);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  navigate(`/hashtags/${tag}`);
                }
              }}
            >
              {part}
            </span>
          );
        }
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <span
              key={`${part}-${index}`}
              className="rich-text-token mention interactive"
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/users/${username}`);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  navigate(`/users/${username}`);
                }
              }}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      })}
    </span>
  );
}

export default RichText;
