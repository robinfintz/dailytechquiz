import Parser from "rss-parser";

const parser = new Parser();

const RSS_FEEDS = [
  "https://techcrunch.com/feed/",
  "https://venturebeat.com/feed/",
  "https://openai.com/blog/rss.xml",
] as const;

const HN_TOP = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM = (id: number) =>
  `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

export interface NewsItem {
  title: string;
  summary: string;
  link: string;
  publishedAt: Date;
  source: string;
  score?: number;
}

function last24h(): Date {
  const d = new Date();
  d.setHours(d.getHours() - 24);
  return d;
}

export async function fetchRssItems(): Promise<NewsItem[]> {
  const cutoff = last24h();
  const all: NewsItem[] = [];

  for (const url of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      const source = feed.title ?? new URL(url).hostname;
      for (const item of feed.items) {
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
        if (pubDate < cutoff) continue;
        all.push({
          title: item.title ?? "No title",
          summary: ([item.contentSnippet, item.content]
            .filter(Boolean)
            .map((s) => (s ?? "").slice(0, 500))
            .join(" ") || item.title) ?? "",
          link: item.link ?? "",
          publishedAt: pubDate,
          source,
        });
      }
    } catch (e) {
      console.error("RSS fetch failed:", url, e);
    }
  }

  return all.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function fetchHnItems(): Promise<NewsItem[]> {
  const cutoff = last24h();
  const cutoffSec = Math.floor(cutoff.getTime() / 1000);

  const res = await fetch(HN_TOP);
  const ids: number[] = await res.json();
  const top20 = ids.slice(0, 20);
  const items: NewsItem[] = [];

  for (const id of top20) {
    try {
      const itemRes = await fetch(HN_ITEM(id));
      const item = await itemRes.json();
      if (!item || item.type !== "story" || item.dead || item.deleted) continue;
      if (item.time < cutoffSec) continue;
      if (item.title?.toLowerCase().includes("hiring")) continue; // skip job posts
      items.push({
        title: item.title ?? "No title",
        summary: item.title ?? "",
        link: item.url ?? `https://news.ycombinator.com/item?id=${id}`,
        publishedAt: new Date(item.time * 1000),
        source: "Hacker News",
        score: item.score ?? 0,
      });
    } catch {
      // skip
    }
  }

  return items.sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0) || b.publishedAt.getTime() - a.publishedAt.getTime()
  );
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const [rss, hn] = await Promise.all([fetchRssItems(), fetchHnItems()]);
  const combined = [...rss, ...hn].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );
  return combined.slice(0, 20);
}

export function newsToSummaries(items: NewsItem[]): string {
  return items
    .map(
      (i) =>
        `[${i.source}] ${i.title}\n${i.summary.slice(0, 400)}${i.summary.length > 400 ? "..." : ""}`
    )
    .join("\n\n");
}
