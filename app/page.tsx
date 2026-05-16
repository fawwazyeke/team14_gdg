import { EventExplorer } from "@/components/event-explorer";
import { defaultWindow } from "@/lib/events/date";
import { getEvents } from "@/lib/events/pipeline";

export default async function Home() {
  const window = defaultWindow();
  const events = await getEvents({
    from: window.from,
    to: window.to,
    minSocialScore: 1
  });

  return <EventExplorer initialEvents={events} initialWindow={window} />;
}
