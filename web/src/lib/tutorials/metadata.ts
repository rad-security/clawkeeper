import type { Metadata } from "next";

interface TutorialMetadataOptions {
  title: string;
  description: string;
  slug: string;
}

export function tutorialMetadata({ title, description, slug }: TutorialMetadataOptions): Metadata {
  const fullTitle = `${title} | Clawkeeper Tutorials`;
  const url = `https://clawkeeper.dev/tutorials/${slug}`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
