import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchSchedule, ScheduleEntry, ScheduleResponse } from "@/lib/api";

export const revalidate = 0;

export default async function SchedulePage() {
  let schedule: ScheduleResponse = {};
  let failed = false;

  try {
    schedule = await fetchSchedule();
  } catch (error) {
    console.error("Failed to fetch schedule:", error);
    failed = true;
  }

  const dayEntries = Object.entries(schedule) as [string, ScheduleEntry[]][];
  const isEmpty = dayEntries.length === 0;

  if (failed || isEmpty) {
    return (
      <div className="mx-auto w-full max-w-3xl py-10 text-center">
        <p className="text-xl text-white/70">
          {failed
            ? "No hem pogut carregar l'horari. Torna-ho a intentar aviat."
            : "Estem preparant l'horari. Torna aviat!"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 pt-30 sm:px-6">
      <h1 className="text-5xl uppercase tracking-[0.4em] font-bold text-cta text-center">
        HORARI
      </h1>
      {dayEntries.map(([day, tasks]) => (
        <Card key={day} className="mt-30">
          <CardHeader>
            <CardTitle className="text-center text-4xl md:text-5xl text-cta/80">
              {day}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[640px] text-sm sm:text-base text-cta/80">
                <TableHeader>
                  <TableRow className="text-xs uppercase tracking-wide text-cta/70 sm:text-sm md:text-base">
                    <TableHead className="text-cta/80 font-bold">
                      Ubicació
                    </TableHead>
                    <TableHead className="text-cta/80 font-bold">
                      Inici
                    </TableHead>
                    <TableHead className="text-cta/80 font-bold">
                      Final
                    </TableHead>
                    <TableHead className="text-cta/80 font-bold">
                      Activitat
                    </TableHead>
                    <TableHead className="text-cta/80 font-bold">
                      Descripció
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task, index) => {
                    const activityTitle =
                      task.Title ?? task.title ?? "Sense títol";
                    const activityDescription =
                      task.Description ?? task.description ?? "—";
                    return (
                      <TableRow
                        key={`${day}-${index}`}
                        className="h-20 text-xs sm:text-sm md:text-base text-cta/80"
                      >
                        <TableCell className="font-semibold">
                          {task.location}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {task.start}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {task.end}
                        </TableCell>
                        <TableCell>{activityTitle}</TableCell>
                        <TableCell className="max-w-xl">
                          {activityDescription}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
