import { useState } from 'react';
import { cn } from '../../utils/cn';
import { assetUrl, initials } from '../../utils/format';

const SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-24 w-24 text-2xl' };
const COLORS = ['bg-indigo-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-teal-500', 'bg-fuchsia-500'];
const colorFor = (name = '') => COLORS[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % COLORS.length];

export default function Avatar({ name = '', src, size = 'md', className }) {
  const [failed, setFailed] = useState(false);
  const url = assetUrl(src);
  return url && !failed ? (
    <img src={url} alt={name} onError={() => setFailed(true)} className={cn('shrink-0 rounded-full object-cover ring-2 ring-surface', SIZES[size], className)} />
  ) : (
    <span aria-label={name} className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface', SIZES[size], colorFor(name), className)}>
      {initials(name)}
    </span>
  );
}
