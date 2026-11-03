import React from 'react';

export interface ColophonItem {
  label?: string;
  value: string;
  isMono?: boolean;
}

export interface BookDetailColophonProps {
  items: ColophonItem[];
  variant?: 'mobile' | 'desktop';
}

export const BookDetailColophon: React.FC<BookDetailColophonProps> = ({
  items,
  variant = 'desktop',
}) => {
  if (items.length === 0) return null;

  const isDesktop = variant === 'desktop';

  return (
    <div
      className={
        isDesktop
          ? 'pt-1.5 sm:pt-2 border-t border-amber-900/15 dark:border-[#242E42] flex items-center justify-center gap-1.5 flex-wrap text-[11px] font-serif text-stone-600 dark:text-slate-400 text-center'
          : 'pt-2 border-t border-amber-900/15 dark:border-[#242E42] flex items-center justify-center gap-1.5 flex-wrap text-[11px] font-serif text-stone-600 dark:text-slate-400 text-center'
      }
    >
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-amber-900/30 dark:text-slate-600">·</span>}
          <span
            className={
              item.isMono
                ? `font-mono ${isDesktop ? 'text-[10.5px]' : 'text-[10px]'} text-stone-500 dark:text-slate-400`
                : ''
            }
          >
            {item.label ? (
              <span className="text-[9.5px] uppercase font-mono tracking-wider text-stone-600 dark:text-slate-400 mr-1">
                {item.label}
              </span>
            ) : null}
            {item.value}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};
