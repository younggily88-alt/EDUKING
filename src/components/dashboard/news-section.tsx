import type { DashboardData } from "@/lib/dashboard-data";
import { NewsBoard } from "./news-board";
import { NewsFetchButton } from "./news-fetch-button";
import { Card, LoadError } from "./ui";

export function NewsSection({
  news,
  categories,
}: {
  news: DashboardData["news"];
  categories: DashboardData["categories"];
}) {
  return (
    <Card title="교육계 주요 뉴스" action={<NewsFetchButton />}>
      {news.failed || categories.failed ? (
        <LoadError />
      ) : (
        <NewsBoard news={news.data} categories={categories.data} />
      )}
    </Card>
  );
}
