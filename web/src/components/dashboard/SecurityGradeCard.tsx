import { Card, CardContent } from "@/components/ui/card";

const gradeColors: Record<string, string> = {
  A: "text-green-600 bg-green-50 dark:bg-green-950",
  B: "text-green-500 bg-green-50 dark:bg-green-950",
  C: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950",
  D: "text-orange-600 bg-orange-50 dark:bg-orange-950",
  F: "text-red-600 bg-red-50 dark:bg-red-950",
};

export function SecurityGradeCard({
  grade,
  count,
  total,
}: {
  grade: string;
  count: number;
  total: number;
}) {
  return (
    <Card className={count > 0 ? gradeColors[grade] : ""}>
      <CardContent className="flex flex-col items-center py-4">
        <span className="text-3xl font-bold">{grade}</span>
        <span className="text-sm">
          {count} host{count !== 1 ? "s" : ""}
        </span>
        {total > 0 && (
          <span className="text-xs opacity-70">
            {Math.round((count / total) * 100)}%
          </span>
        )}
      </CardContent>
    </Card>
  );
}
