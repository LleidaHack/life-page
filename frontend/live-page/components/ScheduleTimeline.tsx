import "./schedule-timeline.css";

type Activity = {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  points: number;
};

const dateFormat = new Intl.DateTimeFormat("ca-ES", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Madrid",
});
const timeFormat = new Intl.DateTimeFormat("ca-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

export default function ScheduleTimeline({
  activities,
  now,
}: {
  activities: Activity[];
  now: number;
}) {
  const upcoming = activities
    .filter((activity) => Date.parse(activity.end) > now)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  if (!upcoming.length) return <p>No hi ha més activitats programades.</p>;

  return (
    <ol className="schedule-timeline">
      {upcoming.map((activity, index) => {
        const active = Date.parse(activity.start) <= now && now < Date.parse(activity.end);
        return (
          <li key={activity.id} className="schedule-timeline-item" aria-current={active ? "step" : undefined}>
            <img
              className="schedule-timeline-character"
              src={`/hackeps/cabeza${index % 6 + 1}.svg`}
              alt=""
              aria-hidden="true"
              width={96}
              height={96}
            />
            <div className="schedule-timeline-content">
              {active && <span className="schedule-timeline-now">Ara mateix</span>}
              <h3>{activity.title}</h3>
              <p className="schedule-timeline-time">
                <time dateTime={activity.start}>{dateFormat.format(new Date(activity.start))} · {timeFormat.format(new Date(activity.start))}</time>
                {" – "}<time dateTime={activity.end}>{timeFormat.format(new Date(activity.end))}</time>
              </p>
              {activity.location && <p>{activity.location}</p>}
              {activity.points > 0 && <p className="schedule-timeline-points">+{activity.points} LleidaCoins per participar</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
