import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-4 mt-10 text-2xl font-bold tracking-tight text-white">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-3 mt-8 text-lg font-semibold text-white">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-2 mt-6 text-base font-semibold text-zinc-200">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="mb-4 leading-relaxed text-zinc-400">{children}</p>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith("/")) {
        return (
          <Link href={href} className="text-cyan-400 underline underline-offset-4 hover:text-cyan-300">
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 underline underline-offset-4 hover:text-cyan-300"
        >
          {children}
        </a>
      );
    },
    ul: ({ children }) => (
      <ul className="mb-4 list-disc space-y-1 pl-6 text-zinc-400">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 list-decimal space-y-1 pl-6 text-zinc-400">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    code: ({ children, className }) => {
      // Inline code (no className means not a code block)
      if (!className) {
        return (
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-cyan-300">
            {children}
          </code>
        );
      }
      return <code className={className}>{children}</code>;
    },
    pre: ({ children }) => (
      <pre className="mb-4 overflow-x-auto rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-relaxed">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mb-4 border-l-2 border-cyan-500/50 pl-4 text-zinc-500 italic">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-white/10 text-left text-zinc-300">
        {children}
      </thead>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 font-semibold">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border-b border-white/5 px-3 py-2 text-zinc-400">
        {children}
      </td>
    ),
    hr: () => <hr className="my-8 border-white/10" />,
    ...components,
  };
}
